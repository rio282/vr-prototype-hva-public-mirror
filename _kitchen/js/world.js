// World systems, debug helpers, and continuous updates.
// This file contains environment-level logic that is not tied to one ingredient.

// ===== DEBUG RAY COMPONENT =====

AFRAME.registerComponent("debug-ray", {

  init: function () {

    this.el.addEventListener("click", e => {
      console.log("Ray hit:", e.target.id || e.target.tagName);
    });

  }

});


// ===== PLAYER BOUNDARY COMPONENT =====

AFRAME.registerComponent("wall-boundary", {

  schema: {
    minX: { type: "number", default: -9.55 },
    maxX: { type: "number", default: 9.55 },
    minZ: { type: "number", default: -9.55 },
    maxZ: { type: "number", default: 9.55 }
  },

  tick: function () {

    const p = this.el.object3D.position;
    p.x = Math.min(this.data.maxX, Math.max(this.data.minX, p.x));
    p.z = Math.min(this.data.maxZ, Math.max(this.data.minZ, p.z));

  }

});


// ===== KEYBOARD DEBUG ROTATION =====

let selectedObject = null;

document.addEventListener("click", function (e) {

  const el = e.target;

  if (el && el.object3D) {
    selectedObject = el;
    console.log("Geselecteerd object:", el.id || el.tagName);
  }

});

document.addEventListener("keydown", function (e) {

  const isArrow =
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "ArrowUp" ||
    e.key === "ArrowDown";

  if (isArrow) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "ArrowLeft") arrowKeysDown.left = true;
    if (e.key === "ArrowRight") arrowKeysDown.right = true;
  }

  let target = heldObject || document.querySelector("#stoveKnob");

  const rot = target.getAttribute("rotation");

  if (e.key === "ArrowLeft") rot.y -= 10;
  if (e.key === "ArrowRight") rot.y += 10;
  if (e.key === "ArrowUp") rot.x += 10;
  if (e.key === "ArrowDown") rot.x -= 10;

  target.setAttribute("rotation", rot);

}, true);

// Prevent movement-controls from consuming arrow keys
document.addEventListener("keyup", function (e) {

  const isArrow =
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "ArrowUp" ||
    e.key === "ArrowDown";

  if (isArrow) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "ArrowLeft") arrowKeysDown.left = false;
    if (e.key === "ArrowRight") arrowKeysDown.right = false;
  }

}, true);


// ===== MOUSE DRAG COMPONENT (Desktop testing) =====

AFRAME.registerComponent("mouse-drag", {

  init: function () {

    this.dragging = false;

    this.el.addEventListener("mousedown", () => {

      if (isVrActive()) return;

      this.dragging = true;
      heldObject = this.el;

      const camera = document.querySelector("#camera");

      // Disable physics while the object is held by the camera
      if (this.el.body) {
        this.el.removeAttribute("dynamic-body");
      }

      // Attach object to camera for simple desktop grab behavior
      camera.object3D.add(this.el.object3D);

      // Hold position in front of the camera
      this.el.object3D.position.set(0, -0.2, -1.2);

      console.log("Pakken:", this.el.id);

    });

    document.addEventListener("mouseup", () => {

      if (isVrActive()) return;
      if (!this.dragging) return;

      this.dragging = false;
      heldObject = null;

      const scene = document.querySelector("a-scene");

      // Keep world transform before reparenting back to scene
      const worldPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(worldPos);

      // Reparent object back to the scene root
      scene.object3D.add(this.el.object3D);

      // Restore world-space position
      this.el.object3D.position.copy(worldPos);

      // Re-enable physics after release
      setTimeout(() => {

        this.el.setAttribute("dynamic-body", "mass:1");

        // Clear residual velocity after release
        if (this.el.body) {
          this.el.body.velocity.set(0, 0, 0);
          this.el.body.angularVelocity.set(0, 0, 0);
        }

      }, 50);

      console.log("Losgelaten:", this.el.id);

    });

  }

});


// ===== SOUP COLOR SYSTEM =====

AFRAME.registerComponent("soup-system", {

  tick: function () {

    const soup = document.querySelector("#soup");
    if (!soup) return;

    let color = "#220000";

    if (actions.tomatoesInPan >= 3) color = "#552200";
    if (actions.waterCups >= 1) color = "#884400";
    if (actions.waterCups >= 2) color = "#cc3300";
    if (stoveOn && actions.waterCups >= 2) color = "#ff5533";

    soup.setAttribute("color", color);

  }

});


// ===== SOUP ANIMATION COMPONENT =====

AFRAME.registerComponent("boiling-soup", {

  init: function () {

    this.timer = 0;

  },

  tick: function (time) {

    if (!stoveOn) return;

    this.el.addEventListener("body-loaded", () => {
      this.el.body.fixedRotation = true;
      this.el.body.updateMassProperties();
    });

    if (time - this.timer < 800) return;

    this.timer = time;

    if (actions.waterCups >= 2) {
      this.spawnBubble();
      this.moveIngredients();
    }

    this.spawnSteam();

  },

  spawnBubble: function () {

    const pan = document.querySelector("#pan");
    const pos = pan.getAttribute("position");

    const bubble = document.createElement("a-sphere");
    bubble.setAttribute("bubble", "");
    bubble.setAttribute("radius", "0.03");
    bubble.setAttribute("color", "#ffffff");

    const x = pos.x + (Math.random() * 0.3 - 0.15);
    const z = pos.z + (Math.random() * 0.3 - 0.15);

    bubble.setAttribute("position", `${x} ${pos.y + 0.05} ${z}`);
    bubble.setAttribute("animation", `property:position;to:${x} ${pos.y + 0.2} ${z};dur:800`);
    bubble.setAttribute("animation__fade", "property:opacity;to:0;dur:800");

    this.el.sceneEl.appendChild(bubble);

  },

  spawnSteam: function () {

    const pan = document.querySelector("#pan");
    const pos = pan.getAttribute("position");

    const steam = document.createElement("a-sphere");
    steam.setAttribute("steam", "");
    steam.setAttribute("radius", "0.08");
    steam.setAttribute("color", "#ffffff");
    steam.setAttribute("opacity", "0.2");

    const x = pos.x + (Math.random() * 0.2 - 0.1);
    const z = pos.z + (Math.random() * 0.2 - 0.1);

    steam.setAttribute("position", `${x} ${pos.y + 0.2} ${z}`);
    steam.setAttribute("animation", `property:position;to:${x} ${pos.y + 0.6} ${z};dur:2000`);
    steam.setAttribute("animation__fade", "property:opacity;to:0;dur:2000");

    this.el.sceneEl.appendChild(steam);

  },

  moveIngredients: function () {

    // Move tomato pieces inside the pan area
    const pan = document.querySelector("#pan");
    const panPos = pan ? pan.getAttribute("position") : null;

    const tomatoPieces = document.querySelectorAll("[tomato-piece]");
    tomatoPieces.forEach(p => {

      if (!panPos) return;

      const pos = p.getAttribute("position");
      let nx = pos.x + (Math.random() * 0.02 - 0.01);
      let nz = pos.z + (Math.random() * 0.02 - 0.01);

      const dx = nx - panPos.x;
      const dz = nz - panPos.z;
      const maxR = 0.15;
      const r = Math.sqrt(dx * dx + dz * dz);

      if (r > maxR) {
        const s = maxR / r;
        nx = panPos.x + dx * s;
        nz = panPos.z + dz * s;
      }

      const ny = panPos.y + 0.08 + Math.sin(Date.now() / 300) / 60;
      p.setAttribute("position", `${nx} ${ny} ${nz}`);

    });

    // Move bacon pieces while they are in the pan
    const baconPieces = document.querySelectorAll("[bacon]");
    baconPieces.forEach(b => {

      if (!b.getAttribute("inPan")) return;

      const pos = b.getAttribute("position");
      const nx = pos.x + (Math.random() * 0.02 - 0.01);
      const nz = pos.z + (Math.random() * 0.02 - 0.01);

      b.setAttribute("position", `${nx} ${pos.y} ${nz}`);

    });

    // If egg is broken, keep yolk floating
    if (actions.eggBroken) {

      let yolk = document.querySelector("#yolk");

      if (!yolk) {

        const pan = document.querySelector("#pan");
        yolk = document.createElement("a-sphere");
        yolk.setAttribute("id", "yolk");
        yolk.setAttribute("egg-yolk", "");
        yolk.setAttribute("radius", "0.12");
        yolk.setAttribute("color", "yellow");

        const p = pan.getAttribute("position");
        yolk.setAttribute("position", `${p.x} ${p.y + 0.02} ${p.z}`);

        this.el.sceneEl.appendChild(yolk);

      }

      const pos = yolk.getAttribute("position");
      const ny = pos.y + Math.sin(Date.now() / 200) / 50;
      yolk.setAttribute("position", `${pos.x} ${ny} ${pos.z}`);

    }

  }

});


// ===== UI REFRESH LOOP =====

setInterval(() => {

  if (!game.recipe) return;

  updateStep();
  updateProgress();

}, 300);
