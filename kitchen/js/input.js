// VR hand input and object grabbing system.
// This file handles controller input, grab mechanics, hand-to-object attachment, and height adjustment for VR interactions.

// ===== VR HAND GRAB COMPONENT =====
AFRAME.registerComponent("vr-hand-grab", {

  schema: {
    touchRadius: { type: "number", default: 0.24 },
    palmX: { type: "number", default: 0 },
    palmY: { type: "number", default: -0.02 },
    palmZ: { type: "number", default: -0.12 }
  },

  init: function () {

    this.heldEl = null;
    this.hadDynamic = false;
    this.savedDynamic = "";
    this.wasGrabPressed = false;
    this.lastUiClickTime = 0;

    this.onPress = this.onPress.bind(this);
    this.onRelease = this.onRelease.bind(this);

    this.pressEvents = ["gripdown", "triggerdown", "pinchstarted"];
    this.releaseEvents = ["gripup", "triggerup", "pinchended"];

    this.pressEvents.forEach(evt => this.el.addEventListener(evt, this.onPress));
    this.releaseEvents.forEach(evt => this.el.addEventListener(evt, this.onRelease));

  },

  clickHovered: function () {

    // Click the currently hovered UI element when no nearby grabbable was found.
    const now = performance.now();
    if (now - this.lastUiClickTime < 180) return;

    const ray = this.el.components.raycaster;
    if (!ray || !ray.intersections || !ray.intersections.length) return;

    let targetEl = ray.intersections[0].object && ray.intersections[0].object.el;
    while (targetEl && !targetEl.classList.contains("clickable")) {
      targetEl = targetEl.parentEl;
    }
    if (!targetEl) return;

    if (uiState.menuOpen && !targetEl.closest("#uiAnchor")) return;

    targetEl.emit("click", { hand: this.el }, false);
    this.lastUiClickTime = now;

  },

  remove: function () {

    this.pressEvents.forEach(evt => this.el.removeEventListener(evt, this.onPress));
    this.releaseEvents.forEach(evt => this.el.removeEventListener(evt, this.onRelease));

  },

  isGrabPressed: function () {

    let gamepad = null;

    const tracked = this.el.components["tracked-controls"];
    if (tracked && tracked.controller && tracked.controller.gamepad) {
      gamepad = tracked.controller.gamepad;
    }

    const oculus = this.el.components["oculus-touch-controls"];
    if (!gamepad && oculus && oculus.controller && oculus.controller.gamepad) {
      gamepad = oculus.controller.gamepad;
    }

    if (!gamepad || !gamepad.buttons) return false;

    const b = gamepad.buttons;
    const isPressed = idx => !!(b[idx] && b[idx].pressed);
    return isPressed(0) || isPressed(1);

  },

  distanceToObject: function (handPos, el) {

    if (!el || !el.object3D || !el.object3D.visible) return Infinity;

    const box = new THREE.Box3().setFromObject(el.object3D);
    if (!isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z)) return Infinity;

    const closest = box.clampPoint(handPos, new THREE.Vector3());
    return handPos.distanceTo(closest);

  },

  findTouchTarget: function () {

    const handPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(handPos);

    let best = null;
    let bestD = this.data.touchRadius;

    document.querySelectorAll(".grabbable").forEach(el => {
      if (el.dataset && el.dataset.vrHeldBy) return;
      const d = this.distanceToObject(handPos, el);
      if (d < bestD) {
        best = el;
        bestD = d;
      }
    });

    return best;

  },

  attach: function (target) {

    this.heldEl = target;
    heldObject = target;
    target.dataset.vrHeldBy = this.el.id || "hand";
    target.emit("grab-start", { hand: this.el }, false);

    if (target.id === "stoveKnob") return;

    this.hadDynamic = target.hasAttribute("dynamic-body");
    if (this.hadDynamic) {
      this.savedDynamic = target.getAttribute("dynamic-body");
      target.removeAttribute("dynamic-body");
    }

    this.el.object3D.add(target.object3D);
    target.object3D.position.set(this.data.palmX, this.data.palmY, this.data.palmZ);
    target.object3D.rotation.set(0, 0, 0);

  },

  drop: function () {

    if (!this.heldEl) return;

    const target = this.heldEl;
    target.emit("grab-end", { hand: this.el }, false);

    if (target.id !== "stoveKnob") {

      const scene = document.querySelector("a-scene");
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();

      target.object3D.getWorldPosition(worldPos);
      target.object3D.getWorldQuaternion(worldQuat);

      scene.object3D.add(target.object3D);
      target.object3D.position.copy(worldPos);
      target.object3D.quaternion.copy(worldQuat);

      if (this.hadDynamic) {

        const isTomato = target.hasAttribute("tomato");
        const tomatoBody = "shape:sphere; sphereRadius:0.15; mass:1; angularDamping:1; linearDamping:0.9";
        target.setAttribute("dynamic-body", isTomato ? tomatoBody : (this.savedDynamic || "mass:1"));

        // Keep tomato velocity untouched after release so gravity can settle it naturally.
        if (!isTomato) {
          setTimeout(() => {
            if (target.body) {
              target.body.velocity.set(0, 0, 0);
              target.body.angularVelocity.set(0, 0, 0);
            }
          }, 50);
        }

      }

      // Tomatoes may be grabbed while temporarily static on the board.
      // Force physics back on drop in VR so they do not remain floating.
      if (target.hasAttribute("tomato") && !target.hasAttribute("dynamic-body")) {
        target.setAttribute("dynamic-body", "shape:sphere; sphereRadius:0.15; mass:1; angularDamping:1; linearDamping:0.9");
      }

    }

    this.heldEl = null;
    if (heldObject === target) heldObject = null;
    if (target.dataset) delete target.dataset.vrHeldBy;
    this.hadDynamic = false;
    this.savedDynamic = "";

  },

  onPress: function () {

    if (this.heldEl) return;
    const target = this.findTouchTarget();
    if (!target) {
      this.clickHovered();
      return;
    }
    this.attach(target);

  },

  onRelease: function () {

    this.drop();

  },

  tick: function () {

    const pressed = this.isGrabPressed();
    if (pressed && !this.wasGrabPressed) this.onPress();
    if (!pressed && this.wasGrabPressed) this.onRelease();
    this.wasGrabPressed = pressed;

    if (!this.heldEl || this.heldEl.id === "stoveKnob") return;
    this.heldEl.object3D.position.set(this.data.palmX, this.data.palmY, this.data.palmZ);
    this.heldEl.object3D.rotation.set(0, 0, 0);

  }

});



// ===== GEOMETRY HELPER FUNCTIONS =====

function addTomatoStem(tomato) {

  // Shared geometry helper used by reset-time spawning.
  const stem = document.createElement("a-cylinder");
  stem.setAttribute("position", "0 0.155 0");
  stem.setAttribute("radius", "0.012");
  stem.setAttribute("height", "0.02");
  stem.setAttribute("color", "#2e7d32");

  const leaf = document.createElement("a-cone");
  leaf.setAttribute("position", "0 0.17 0");
  leaf.setAttribute("radius-bottom", "0.03");
  leaf.setAttribute("radius-top", "0");
  leaf.setAttribute("height", "0.02");
  leaf.setAttribute("color", "#3f9f45");

  tomato.appendChild(stem);
  tomato.appendChild(leaf);

}

function addBaconStripes(bacon) {

  [-0.06, 0, 0.06].forEach(x => {
    const stripe = document.createElement("a-box");
    stripe.setAttribute("position", `${x} 0.017 0`);
    stripe.setAttribute("width", x === 0 ? "0.03" : "0.024");
    stripe.setAttribute("height", "0.006");
    stripe.setAttribute("depth", "0.19");
    stripe.setAttribute("color", "#7a1414");
    bacon.appendChild(stripe);
  });

}

function addSaltCap(salt) {

  const cap = document.createElement("a-cylinder");
  cap.setAttribute("position", "0 0.14 0");
  cap.setAttribute("radius", "0.055");
  cap.setAttribute("height", "0.04");
  cap.setAttribute("color", "#b6bcc2");
  salt.appendChild(cap);

}

function addSpoonBowl(spoon) {

  const bowl = document.createElement("a-sphere");
  bowl.setAttribute("position", "0 -0.16 0");
  bowl.setAttribute("scale", "0.75 1.45 0.9");
  bowl.setAttribute("radius", "0.062");
  bowl.setAttribute("color", "#7a3f12");
  spoon.appendChild(bowl);

}

function addCupGlassShell(cup) {

  const water = document.createElement("a-cylinder");
  water.setAttribute("position", "0 -0.02 0");
  water.setAttribute("radius", "0.074");
  water.setAttribute("height", "0.11");
  water.setAttribute("color", "#6db6ff");
  water.setAttribute("opacity", "0.7");

  const shell = document.createElement("a-cylinder");
  shell.setAttribute("position", "0 0 0");
  shell.setAttribute("radius", "0.105");
  shell.setAttribute("height", "0.2");
  shell.setAttribute("color", "#e2e6ea");
  shell.setAttribute("opacity", "0.12");

  cup.appendChild(water);
  cup.appendChild(shell);

}

function addKnifeDetails(knife) {

  const bladeBody = document.createElement("a-box");
  bladeBody.setAttribute("position", "0 0 -0.14");
  bladeBody.setAttribute("width", "0.028");
  bladeBody.setAttribute("height", "0.028");
  bladeBody.setAttribute("depth", "0.12");
  bladeBody.setAttribute("color", "#c9c9c9");

  const bladeTip = document.createElement("a-cone");
  bladeTip.setAttribute("position", "0 0 -0.3");
  bladeTip.setAttribute("radius-bottom", "0.03");
  bladeTip.setAttribute("radius-top", "0.002");
  bladeTip.setAttribute("height", "0.24");
  bladeTip.setAttribute("rotation", "-90 0 0");
  bladeTip.setAttribute("color", "#d9d9d9");

  knife.appendChild(bladeBody);
  knife.appendChild(bladeTip);

}


// ===== INITIAL STATE CACHING =====

window.addEventListener("load", () => {

  // Cache initial transforms for clean resets.
  document.querySelectorAll(".grabbable, #stoveKnob").forEach(el => {

    if (el.id) {
      startPositions[el.id] = {
        el: el,
        pos: el.getAttribute("position"),
        rot: el.getAttribute("rotation")
      };
    }

  });

});




// ===== VR HEIGHT ADJUSTMENT COMPONENT =====

AFRAME.registerComponent("vr-height-adjust", {

  schema: {
    step: { type: "number", default: 0.05 },
    minYOffset: { type: "number", default: -0.8 },
    maxYOffset: { type: "number", default: 0.8 }
  },

  init: function () {

    this.prev = {
      leftX: false,
      leftY: false,
      rightA: false,
      rightB: false
    };

    this.listenersAttached = false;
    this.onLower = this.onLower.bind(this);
    this.onHigher = this.onHigher.bind(this);

    const p = this.el.getAttribute("position") || { x: 0, y: 0, z: 0 };
    this.targetYOffset = p.y;

  },

  attachButtonListeners: function () {

    if (this.listenersAttached) return;

    const left = document.getElementById("leftHand");
    const right = document.getElementById("rightHand");
    if (!left || !right) return;

    left.addEventListener("xbuttondown", this.onLower);
    left.addEventListener("ybuttondown", this.onHigher);
    right.addEventListener("abuttondown", this.onLower);
    right.addEventListener("bbuttondown", this.onHigher);

    this.listenersAttached = true;

  },

  onLower: function () {

    if (uiState.menuOpen) return;
    this.adjustHeight(-this.data.step);

  },

  onHigher: function () {

    if (uiState.menuOpen) return;
    this.adjustHeight(this.data.step);

  },

  getGamepad: function (handId) {

    const hand = document.getElementById(handId);
    if (!hand) return null;

    const tracked = hand.components["tracked-controls"];
    if (tracked && tracked.controller && tracked.controller.gamepad) {
      return tracked.controller.gamepad;
    }

    const oculus = hand.components["oculus-touch-controls"];
    if (oculus && oculus.controller && oculus.controller.gamepad) {
      return oculus.controller.gamepad;
    }

    return null;

  },

  isPressed: function (gamepad, index) {

    return !!(gamepad && gamepad.buttons && gamepad.buttons[index] && gamepad.buttons[index].pressed);

  },

  adjustHeight: function (delta) {

    const pos = this.el.getAttribute("position") || { x: 0, y: 0, z: 0 };
    const nextY = THREE.MathUtils.clamp(this.targetYOffset + delta, this.data.minYOffset, this.data.maxYOffset);
    this.targetYOffset = nextY;
    this.el.setAttribute("position", `${pos.x} ${nextY} ${pos.z}`);

  },

  tick: function () {

    this.attachButtonListeners();
    if (!isVrActive()) return;

    const rigPos = this.el.getAttribute("position") || { x: 0, y: 0, z: 0 };
    if (Math.abs((rigPos.y || 0) - this.targetYOffset) > 0.001) {
      this.el.setAttribute("position", `${rigPos.x} ${this.targetYOffset} ${rigPos.z}`);
    }

    if (uiState.menuOpen) return;

    const leftPad = this.getGamepad("leftHand");
    const rightPad = this.getGamepad("rightHand");

    const leftX = this.isPressed(leftPad, 4);
    const leftY = this.isPressed(leftPad, 5);
    const rightA = this.isPressed(rightPad, 4);
    const rightB = this.isPressed(rightPad, 5);

    if ((leftX && !this.prev.leftX) || (rightA && !this.prev.rightA)) {
      this.adjustHeight(-this.data.step);
    }

    if ((leftY && !this.prev.leftY) || (rightB && !this.prev.rightB)) {
      this.adjustHeight(this.data.step);
    }

    this.prev.leftX = leftX;
    this.prev.leftY = leftY;
    this.prev.rightA = rightA;
    this.prev.rightB = rightB;

  }

});


// ===== MENU IDLE ROTATION COMPONENT =====

AFRAME.registerComponent("menu-idle-rotate", {

  schema: {
    speed: { type: "number", default: 3 }
  },

  tick: function (time, dt) {

    if (!uiState.menuOpen) return;

    const rot = this.el.getAttribute("rotation") || { x: 0, y: 0, z: 0 };
    const step = this.data.speed * ((dt || 16) / 1000);

    this.el.setAttribute("rotation", `${rot.x} ${rot.y + step} ${rot.z}`);

  }

});
