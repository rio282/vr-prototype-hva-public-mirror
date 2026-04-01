// Ingredient interaction components and cooking tools.
// This file contains object-specific behavior for cutting, pouring, stirring, and cooking.

// ===== HELPER =====
function setupGrabbable(el, name, callback) {

    console.log("Component geladen:", name);

    el.addEventListener("click", () => {

        console.log("CLICK:", name);

        el.setAttribute(
            "animation",
            "property:scale;to:1.2 1.2 1.2;dur:150;dir:alternate"
        );

        callback();

    });

}

// ===== TOMATOES =====
AFRAME.registerComponent("tomato", {

    init: function () {

        this.onBoard = false;

        this.el.addEventListener("grab-start", () => {
            // When a tomato is grabbed from the board, re-enable physics so it can fall naturally on release.
            if (this.onBoard) {
                this.onBoard = false;
                if (!this.el.hasAttribute("dynamic-body")) {
                    this.el.setAttribute("dynamic-body", "shape:sphere; sphereRadius:0.15; mass:1; angularDamping:1; linearDamping:0.9");
                }
            }
        });

        this.el.addEventListener("body-loaded", () => {
            this.el.body.fixedRotation = true;
            this.el.body.updateMassProperties();
        });

    },

    tick: function () {

        const board = document.querySelector("#cuttingBoard");
        if (!board) return;

        const pos = this.el.object3D.position;
        const boardPos = board.object3D.position;
        const boardWidth = parseFloat(board.getAttribute("width") || 1);
        const boardDepth = parseFloat(board.getAttribute("depth") || 0.6);
        const boardHeight = parseFloat(board.getAttribute("height") || 0.05);
        const tomatoRadius = parseFloat(this.el.getAttribute("radius") || 0.15);

        // Use board bounds so larger boards keep the same stick mechanic.
        const insideX = Math.abs(pos.x - boardPos.x) <= (boardWidth / 2 - tomatoRadius * 0.35);
        const insideZ = Math.abs(pos.z - boardPos.z) <= (boardDepth / 2 - tomatoRadius * 0.35);
        const boardTopY = boardPos.y + boardHeight / 2;
        const closeToTop = Math.abs(pos.y - (boardTopY + tomatoRadius)) < 0.28;

        if (insideX && insideZ && closeToTop && !this.onBoard) {

            this.onBoard = true;
            actions.tomatoes++;

            console.log("Tomaat op snijplank:", actions.tomatoes);

            // Place the tomato neatly on a free board slot.
            const boardPosition = board.getAttribute("position");
            const boardHeightAttr = parseFloat(board.getAttribute("height") || 0.05);
            const tomatoRadiusAttr = parseFloat(this.el.getAttribute("radius") || 0.15);

            const placedTomatoes = [];
            document.querySelectorAll("[tomato]").forEach((other) => {
                if (other === this.el) return;

                const comp = other.components.tomato;
                if (comp && comp.onBoard) {
                    placedTomatoes.push(other.getAttribute("position"));
                }
            });

            const slotOffsets = [-0.22, 0, 0.22];
            let x = boardPosition.x;
            let z = boardPosition.z;
            let foundSlot = false;

            for (let i = 0; i < slotOffsets.length; i++) {
                const candidateX = boardPosition.x + slotOffsets[i];
                const candidateZ = boardPosition.z;

                let occupied = false;
                for (let j = 0; j < placedTomatoes.length; j++) {
                    const p = placedTomatoes[j];
                    const dx = candidateX - p.x;
                    const dz = candidateZ - p.z;

                    if (Math.sqrt(dx * dx + dz * dz) < 0.28) {
                        occupied = true;
                        break;
                    }
                }

                if (!occupied) {
                    x = candidateX;
                    z = candidateZ;
                    foundSlot = true;
                    break;
                }
            }

            if (!foundSlot) {
                // Fallback spread so tomatoes do not stack perfectly.
                x = boardPosition.x + (Math.random() * 0.4 - 0.2);
                z = boardPosition.z + (Math.random() * 0.14 - 0.07);
            }

            const y = boardPosition.y + boardHeightAttr / 2 + tomatoRadiusAttr + 0.01;
            this.el.setAttribute("position", `${x} ${y} ${z}`);

            // Disable physics while on the board to prevent jittering or collision.
            this.el.removeAttribute("dynamic-body");

        }

    }

});

// ===== TOMATO PIECES =====
AFRAME.registerComponent("tomato-piece", {

    init: function () {

        this.inPan = false;

        this.el.addEventListener("body-loaded", () => {
            this.el.body.fixedRotation = true;
            this.el.body.updateMassProperties();
        });

    },

    tick: function () {

        const pan = document.querySelector("#pan");
        const d = this.el.object3D.position.distanceTo(pan.object3D.position);

        if (d < 0.42 && !this.inPan) {

            this.inPan = true;
            this.el.setAttribute("data-in-pan", "1");

            actions.tomatoesInPan++;
            console.log("Tomaat stuk in pan:", actions.tomatoesInPan);

            this.el.removeAttribute("mouse-drag");
            this.el.removeAttribute("dynamic-body");

            const p = pan.getAttribute("position");

            let x = p.x;
            let z = p.z;
            let tries = 0;
            let overlap = true;

            while (overlap && tries < 16) {

                x = p.x + (Math.random() * 0.26 - 0.13);
                z = p.z + (Math.random() * 0.26 - 0.13);
                overlap = false;

                document.querySelectorAll("[tomato-piece][data-in-pan='1']").forEach((other) => {
                    if (overlap || other === this.el) return;

                    const op = other.getAttribute("position");
                    const dx = x - op.x;
                    const dz = z - op.z;

                    if (Math.sqrt(dx * dx + dz * dz) < 0.09) {
                        overlap = true;
                    }
                });

                tries++;

            }

            this.el.setAttribute("position", `${x} ${p.y + 0.08} ${z}`);
            this.el.setAttribute("radius", "0.05");
            this.el.setAttribute("height", "0.028");
            this.el.setAttribute("rotation", `90 ${Math.random() * 360} 0`);

        }

    }

});

// ===== TOMATO SPLASH FX =====
function tomatoSplash(scene, pos) {

    for (let i = 0; i < 10; i++) {

        const drop = document.createElement("a-sphere");
        drop.setAttribute("radius", "0.02");
        drop.setAttribute("color", "#cc0000");

        const x = pos.x + (Math.random() * 0.2 - 0.1);
        const y = pos.y + 0.1;
        const z = pos.z + (Math.random() * 0.2 - 0.1);

        drop.setAttribute("position", `${x} ${y} ${z}`);
        drop.setAttribute("animation", `property:position;to:${x} ${y - 0.2} ${z};dur:600`);

        scene.appendChild(drop);

    }

}

// ===== TOMATO PIECE SPAWN =====
function spawnTomatoPiece(scene, tomato) {

    const piece = document.createElement("a-cylinder");

    piece.setAttribute("radius", "0.067");
    piece.setAttribute("height", "0.028");
    piece.setAttribute("color", "#d61f1f");
    piece.setAttribute("rotation", `${85 + Math.random() * 10} ${Math.random() * 360} ${Math.random() * 8 - 4}`);

    const pos = tomato.getAttribute("position");
    const spreadX = Math.random() * 0.4 - 0.2;
    const spreadZ = Math.random() * 0.4 - 0.2;

    piece.setAttribute("position", `${pos.x + spreadX} ${pos.y} ${pos.z + spreadZ}`);
    piece.setAttribute("dynamic-body", "mass:0.05; restitution:0.01; friction:0.9; linearDamping:0.95; angularDamping:0.95");

    piece.classList.add("grabbable", "clickable");
    piece.setAttribute("mouse-drag", "");
    piece.setAttribute("tomato-piece", "");

    scene.appendChild(piece);
    actions.tomatoesCut++;

}

// ===== KNIFE =====
AFRAME.registerComponent("knife", {

    init: function () {

        this.lastPos = null;
        this.sawStartPos = null;
        this.sawDirection = 0; // 1 for forward, -1 for backward
        this.cooldown = 0;

    },

    tick: function (time) {

        const worldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(worldPos);

        if (!this.lastPos) {
            this.lastPos = {x: worldPos.x, y: worldPos.y, z: worldPos.z};
            return;
        }

        const moveX = worldPos.x - this.lastPos.x;
        const moveY = worldPos.y - this.lastPos.y;
        const moveZ = worldPos.z - this.lastPos.z;
        const totalMove = Math.abs(moveX) + Math.abs(moveY) + Math.abs(moveZ);

        if (totalMove < 0.01) {
            this.lastPos = {x: worldPos.x, y: worldPos.y, z: worldPos.z};
            return;
        }

        // Detect cutting by checking back-and-forth saw motion.
        const currentDirection = moveZ > 0 ? 1 : -1;

        if (this.sawStartPos === null) {
            // Start of saw motion.
            this.sawStartPos = {x: worldPos.x, y: worldPos.y, z: worldPos.z};
            this.sawDirection = currentDirection;
        } else if (currentDirection !== this.sawDirection) {
            // Direction reversed - check if we moved far enough back.
            const distFromStart = Math.abs(worldPos.z - this.sawStartPos.z);

            if (distFromStart > 0.15) {
                // Proper back-and-forth motion detected.
                if (time - this.cooldown < 400) {
                    this.lastPos = {x: worldPos.x, y: worldPos.y, z: worldPos.z};
                    return;
                }

                const tomatoes = document.querySelectorAll("[tomato]");

                for (const tomato of tomatoes) {
                    const d = worldPos.distanceTo(tomato.object3D.position);
                    const tomatoComp = tomato.components && tomato.components.tomato;
                    const isOnBoard = !!(tomatoComp && tomatoComp.onBoard);

                    if (d < 0.25 && isOnBoard) {

                        console.log("SNIJ DETECTED");

                        for (let i = 0; i < 3; i++) {
                            spawnTomatoPiece(this.el.sceneEl, tomato);
                        }

                        tomatoSplash(this.el.sceneEl, tomato.getAttribute("position"));
                        tomato.remove();

                        this.cooldown = time;
                        break;
                    }
                }

                // Reset saw motion for next cut.
                this.sawStartPos = null;
                this.sawDirection = 0;
            }
        }

        this.lastPos = {x: worldPos.x, y: worldPos.y, z: worldPos.z};

    }

});

// ===== PAN =====
AFRAME.registerComponent("cook-pan", {

    init: function () {

        setupGrabbable(this.el, "Pan", () => {

            this.el.setAttribute("animation", "property:rotation;to:0 0 5;dur:200;dir:alternate");

            if (actions.tomatoesCut > actions.tomatoesInPan) {
                actions.tomatoesInPan++;
                console.log("Tomaat stuk in pan:", actions.tomatoesInPan);
            }

            if (actions.bacon > 0) {
                console.log("Bacon ligt in pan");
            }

        });

    }

});

// ===== BACON =====
AFRAME.registerComponent("bacon", {

    init: function () {
        this.inPan = false;
    },

    tick: function () {

        const pan = document.querySelector("#pan");
        const d = this.el.object3D.position.distanceTo(pan.object3D.position);

        if (d < 0.4 && !this.inPan) {
            this.inPan = true;
            actions.bacon++;
            console.log("Bacon in pan:", actions.bacon);
        }

    }

});

// ===== EGG =====
AFRAME.registerComponent("egg", {

    init: function () {

        setupGrabbable(this.el, "Ei", () => {

            actions.egg = true;
            console.log("Ei gepakt");

            this.el.setAttribute("animation", "property:position;to:1.5 1.3 -2.6;dur:400");

        });

        this.el.addEventListener("grab-start", () => {
            if (!actions.egg) {
                actions.egg = true;
                console.log("Ei gepakt (VR hold)");
            }
        });

        this.tableDropDone = false;

        this.el.addEventListener("body-loaded", () => {
            this.el.body.fixedRotation = true;
            this.el.body.updateMassProperties();
        });

    },

    tick: function () {

        if (!actions.egg && heldObject === this.el) {
            actions.egg = true;
            console.log("Ei gepakt (hold)");
        }

        if (!actions.egg || actions.eggPlacedOnTable || this.tableDropDone) return;
        if (heldObject === this.el) return;

        const table = document.querySelector("#kitchenTable");
        if (!table) return;

        const eggWorld = new THREE.Vector3();
        this.el.object3D.getWorldPosition(eggWorld);

        const tableWorld = new THREE.Vector3();
        table.object3D.getWorldPosition(tableWorld);

        const tableWidth = parseFloat(table.getAttribute("width") || 6);
        const tableDepth = parseFloat(table.getAttribute("depth") || 2);
        const tableHeight = parseFloat(table.getAttribute("height") || 0.1);

        const insideX = Math.abs(eggWorld.x - tableWorld.x) < (tableWidth / 2 - 0.1);
        const insideZ = Math.abs(eggWorld.z - tableWorld.z) < (tableDepth / 2 - 0.1);
        const tableTopY = tableWorld.y + tableHeight / 2;
        const closeToSurface = Math.abs(eggWorld.y - (tableTopY + 0.15)) < 0.2;

        if (insideX && insideZ && closeToSurface) {
            actions.eggPlacedOnTable = true;
            this.tableDropDone = true;
            console.log("Ei op tafel gelegd");
        }

    }

});

// ===== EGG BREAK =====
AFRAME.registerComponent("egg-break", {

    init: function () {

        this.leftHandHolding = false;
        this.rightHandHolding = false;
        this.vrGestureStarted = false;
        this.vrStartHandDistance = 0;
        this.holdingFrameCount = 0;
        this.prevLeftPos = new THREE.Vector3();
        this.prevRightPos = new THREE.Vector3();
        this.pcBothArrowsStart = 0;

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

    isButtonPressed: function (gamepad, index) {
        return !!(gamepad && gamepad.buttons && gamepad.buttons[index] && gamepad.buttons[index].pressed);
    },

    breakEgg: function () {

        if (actions.eggBroken) return;

        console.log("Ei gebroken");

        actions.eggBroken = true;
        this.el.setAttribute("visible", false);

        const oldYolk = document.querySelector("#yolk");
        if (oldYolk) oldYolk.remove();

        const pan = document.querySelector("#pan");
        const panPos = pan.getAttribute("position");

        const yolk = document.createElement("a-sphere");
        yolk.setAttribute("id", "yolk");
        yolk.setAttribute("egg-yolk", "");
        yolk.setAttribute("radius", "0.12");
        yolk.setAttribute("color", "yellow");
        yolk.setAttribute("position", `${panPos.x} ${panPos.y + 0.02} ${panPos.z}`);

        this.el.sceneEl.appendChild(yolk);

        const holderId = (this.el.dataset && this.el.dataset.vrHeldBy) || "";
        const hands = [document.getElementById("leftHand"), document.getElementById("rightHand")].filter(Boolean);

        hands.forEach((hand) => {

            const handPos = new THREE.Vector3();
            hand.object3D.getWorldPosition(handPos);

            const shellPiece = document.createElement("a-entity");
            shellPiece.setAttribute("class", "grabbable clickable");
            shellPiece.setAttribute("egg-shell", "");
            shellPiece.setAttribute("position", `${handPos.x} ${handPos.y - 0.03} ${handPos.z}`);
            shellPiece.setAttribute("rotation", `${Math.random() * 35 - 17.5} ${Math.random() * 360} ${Math.random() * 25 - 12.5}`);
            shellPiece.setAttribute("dynamic-body", "mass:0.2; angularDamping:0.95; linearDamping:0.9");

            const shellOuter = document.createElement("a-sphere");
            shellOuter.setAttribute("radius", "0.075");
            shellOuter.setAttribute("theta-start", "0");
            shellOuter.setAttribute("theta-length", "120");
            shellOuter.setAttribute("color", "#f6edd8");
            shellOuter.setAttribute("scale", "1 0.8 1");

            const shellInner = document.createElement("a-sphere");
            shellInner.setAttribute("radius", "0.066");
            shellInner.setAttribute("theta-start", "0");
            shellInner.setAttribute("theta-length", "120");
            shellInner.setAttribute("color", "#fff8eb");
            shellInner.setAttribute("scale", "1 0.78 1");
            shellInner.setAttribute("position", "0 -0.005 0");

            shellPiece.appendChild(shellOuter);
            shellPiece.appendChild(shellInner);
            this.el.sceneEl.appendChild(shellPiece);

            const grabComp = hand.components["vr-hand-grab"];
            const isHolderHand = hand.id === holderId;
            if (isHolderHand && grabComp && !grabComp.heldEl) {
                grabComp.attach(shellPiece);
            }

        });

        this.leftHandHolding = false;
        this.rightHandHolding = false;

    },

    tick: function (time) {

        const pan = document.querySelector("#pan");
        if (!pan || actions.eggBroken) return;

        const eggWorldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(eggWorldPos);

        const panWorldPos = new THREE.Vector3();
        pan.object3D.getWorldPosition(panWorldPos);

        const dx = eggWorldPos.x - panWorldPos.x;
        const dz = eggWorldPos.z - panWorldPos.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const verticalOffset = eggWorldPos.y - panWorldPos.y;
        const nearPan = horizontalDist < 1.2 && verticalOffset > -0.6 && verticalOffset < 1.9;

        if (!nearPan) {
            this.leftHandHolding = false;
            this.rightHandHolding = false;
            this.vrGestureStarted = false;
            this.holdingFrameCount = 0;
            return;
        }

        const leftHand = document.getElementById("leftHand");
        const rightHand = document.getElementById("rightHand");
        if (!leftHand || !rightHand) return;

        const leftPos = new THREE.Vector3();
        const rightPos = new THREE.Vector3();
        leftHand.object3D.getWorldPosition(leftPos);
        rightHand.object3D.getWorldPosition(rightPos);

        const touchRadius = 0.65;
        const leftNear = leftPos.distanceTo(eggWorldPos) < touchRadius;
        const rightNear = rightPos.distanceTo(eggWorldPos) < touchRadius;

        const leftGpad = this.getGamepad("leftHand");
        const rightGpad = this.getGamepad("rightHand");
        const leftPressing = this.isButtonPressed(leftGpad, 1) || this.isButtonPressed(leftGpad, 0);
        const rightPressing = this.isButtonPressed(rightGpad, 1) || this.isButtonPressed(rightGpad, 0);

        const holderId = (this.el.dataset && this.el.dataset.vrHeldBy) || "";
        const leftIsHolder = holderId === "leftHand";
        const rightIsHolder = holderId === "rightHand";

        if (leftIsHolder) {
            this.leftHandHolding = true;
            this.rightHandHolding = rightNear && (rightPressing || !rightGpad);
        } else if (rightIsHolder) {
            this.rightHandHolding = true;
            this.leftHandHolding = leftNear && (leftPressing || !leftGpad);
        } else {
            this.leftHandHolding = leftNear && leftPressing;
            this.rightHandHolding = rightNear && rightPressing;
        }

        if (this.leftHandHolding && this.rightHandHolding) {

            const currentDistance = leftPos.distanceTo(rightPos);

            if (!this.vrGestureStarted) {

                this.vrGestureStarted = true;
                this.vrStartHandDistance = currentDistance;
                this.holdingFrameCount = 0;
                this.prevLeftPos.copy(leftPos);
                this.prevRightPos.copy(rightPos);

                console.log("Both hands gripping egg, distance=" + currentDistance.toFixed(3));

            } else {

                this.holdingFrameCount++;

                const leftVel = leftPos.distanceTo(this.prevLeftPos);
                const rightVel = rightPos.distanceTo(this.prevRightPos);
                const distanceDelta = currentDistance - this.vrStartHandDistance;
                const separationVel = leftVel + rightVel;

                if (this.holdingFrameCount > 1 && ((distanceDelta > 0.04 && separationVel > 0.003) || distanceDelta > 0.12)) {
                    console.log("Breaking egg: delta=" + distanceDelta.toFixed(3) + ", vel=" + separationVel.toFixed(3));
                    this.breakEgg();
                    return;
                }

            }

            this.prevLeftPos.copy(leftPos);
            this.prevRightPos.copy(rightPos);

        } else {
            this.vrGestureStarted = false;
            this.holdingFrameCount = 0;
        }

        const bothArrowsDown = arrowKeysDown.left && arrowKeysDown.right;
        const pcCanBreak = heldObject === this.el && bothArrowsDown;

        if (pcCanBreak) {
            if (!this.pcBothArrowsStart) {
                this.pcBothArrowsStart = time;
            } else if (time - this.pcBothArrowsStart >= 2000) {
                this.breakEgg();
            }
        } else {
            this.pcBothArrowsStart = 0;
        }

    }

});

function setCookingAudio(shouldPlay) {

    const pan = document.querySelector("#pan");
    if (!pan) return;

    const cookingAudio = document.querySelector("#cookingSound");

    const scene = document.querySelector("a-scene");
    const listener = scene && scene.audioListener;
    const audioCtx = listener && listener.context;
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    if (shouldPlay) {
        if (cookingAudio) {
            cookingAudio.loop = true;
            cookingAudio.volume = cookingEffectsVolume;
            const p = cookingAudio.play();
            if (p && p.catch) p.catch(() => {
            });
        }
    } else if (cookingAudio) {
        cookingAudio.pause();
        cookingAudio.currentTime = 0;
    }

}

// ===== STOVE =====
AFRAME.registerComponent("stove", {

    init: function () {
        this.lastRot = 0;
    },

    tick: function () {

        const rot = this.el.getAttribute("rotation");

        if (rot.y > 40 && !stoveOn) {
            stoveOn = true;
            document.querySelector("#fire").setAttribute("visible", true);
            setCookingAudio(true);
            console.log("Fornuis aan");
        }

        if (rot.y < 10 && stoveOn) {
            stoveOn = false;
            document.querySelector("#fire").setAttribute("visible", false);
            setCookingAudio(false);
            console.log("Fornuis uit");
        }

    }

});

AFRAME.registerComponent("stove-knob", {

    schema: {
        minY: {type: "number", default: 0},
        maxY: {type: "number", default: 90},
        sensitivity: {type: "number", default: 1}
    },

    init: function () {
        this.dragging = false;
        this.startHandAngle = 0;
        this.startKnobY = 0;
    },

    normalizeDelta: function (angle) {
        let a = angle;
        while (a > 180) a -= 360;
        while (a < -180) a += 360;
        return a;
    },

    tick: function () {

        const holderId = this.el.dataset && this.el.dataset.vrHeldBy;
        if (!holderId) {
            this.dragging = false;
            return;
        }

        const hand = document.getElementById(holderId);
        if (!hand) return;

        const parentObj = this.el.object3D.parent;
        if (!parentObj) return;

        const handWorldPos = new THREE.Vector3();
        hand.object3D.getWorldPosition(handWorldPos);

        const handLocalPos = parentObj.worldToLocal(handWorldPos.clone());
        const knobPos = this.el.object3D.position;

        const dx = handLocalPos.x - knobPos.x;
        const dz = handLocalPos.z - knobPos.z;
        const handAngle = THREE.MathUtils.radToDeg(Math.atan2(dx, dz));

        if (!this.dragging) {
            this.dragging = true;
            this.startHandAngle = handAngle;
            this.startKnobY = (this.el.getAttribute("rotation") || {y: 0}).y;
            return;
        }

        const delta = this.normalizeDelta(handAngle - this.startHandAngle);
        const targetY = THREE.MathUtils.clamp(
            this.startKnobY + delta * this.data.sensitivity,
            this.data.minY,
            this.data.maxY
        );

        const rot = this.el.getAttribute("rotation") || {x: 0, y: 0, z: 0};
        this.el.setAttribute("rotation", `${rot.x} ${targetY} ${rot.z}`);

    }

});

// ===== WATER CUP =====
AFRAME.registerComponent("cup", {

    init: function () {

        this.startPos = this.el.getAttribute("position");
        this.startRot = this.el.getAttribute("rotation");

        this.hasPoured = false;
        this.cooldown = false;

    },

    tick: function () {

        if (this.cooldown) return;

        const pan = document.querySelector("#pan");

        const cupWorldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(cupWorldPos);

        const panWorldPos = new THREE.Vector3();
        pan.object3D.getWorldPosition(panWorldPos);

        const dist = cupWorldPos.distanceTo(panWorldPos);

        // Use world orientation so pouring works while held by the camera rig.
        const q = new THREE.Quaternion();
        this.el.object3D.getWorldQuaternion(q);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const tilted = up.y < 0.35;

        if (tilted && dist < 0.6 && !this.hasPoured) {

            this.hasPoured = true;
            this.cooldown = true;

            actions.waterCups++;
            console.log("Water gegoten:", actions.waterCups);

            this.pourAnimation();

        }

    },

    pourAnimation: function () {

        const pan = document.querySelector("#pan");
        const p = pan.getAttribute("position");

        for (let i = 0; i < 12; i++) {

            const drop = document.createElement("a-sphere");
            drop.setAttribute("water-drop", "");

            drop.setAttribute("radius", "0.02");
            drop.setAttribute("color", "#66ccff");

            const x = p.x + (Math.random() * 0.2 - 0.1);
            const z = p.z + (Math.random() * 0.2 - 0.1);

            drop.setAttribute("position", `${x} ${p.y + 0.35} ${z}`);
            drop.setAttribute("animation", `property:position;to:${x} ${p.y};dur:700`);

            this.el.sceneEl.appendChild(drop);

        }

        setTimeout(() => {

            if (heldObject !== this.el) {
                this.el.setAttribute("position", this.startPos);
                this.el.setAttribute("rotation", this.startRot);
            }

            this.hasPoured = false;
            this.cooldown = false;

            console.log("Beker reset");

        }, 1500);

    }

});

// Legacy cup prototype kept for reference.
// AFRAME.registerComponent("cup", {
//   init: function () {
//     const start = this.el.getAttribute("position");
//     this.el.addEventListener("click", () => {
//       const pan = document.querySelector("#pan");
//       const p = pan.getAttribute("position");
//       this.el.setAttribute("animation__move", `property:position;to:${p.x} ${p.y+0.3} ${p.z};dur:400`);
//       this.el.setAttribute("animation__pour", "property:rotation;to:0 0 90;dur:400;delay:400");
//       setTimeout(() => {
//         actions.waterCups++;
//       }, 700);
//       setTimeout(() => {
//         this.el.object3D.position.set(start.x,start.y,start.z);
//         this.el.setAttribute("rotation", "0 0 0");
//       }, 1600);
//     });
//   }
// });

// ===== SALT =====
AFRAME.registerComponent("salt", {

    init: function () {
        this.cooldown = 0;
        this.lastY = null;
        this.lastDir = 0;
    },

    tick: function (time) {

        const pan = document.querySelector("#pan");

        const shakerWorldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(shakerWorldPos);

        const panWorldPos = new THREE.Vector3();
        pan.object3D.getWorldPosition(panWorldPos);

        const dist = shakerWorldPos.distanceTo(panWorldPos);

        const q = new THREE.Quaternion();
        this.el.object3D.getWorldQuaternion(q);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const upsideDown = up.y < 0.25;

        if (this.lastY === null) {
            this.lastY = shakerWorldPos.y;
            return;
        }

        const deltaY = shakerWorldPos.y - this.lastY;
        let dir = 0;
        if (deltaY > 0.003) dir = 1;
        if (deltaY < -0.003) dir = -1;

        if (dist < 0.6 && upsideDown && dir !== 0 && this.lastDir !== 0 && dir !== this.lastDir) {

            if (time - this.cooldown > 220) {
                actions.saltShakes++;
                spawnSaltGrains(this.el.sceneEl);
                console.log("Zout toegevoegd:", actions.saltShakes);
                this.cooldown = time;
            }

        }

        if (dir !== 0) {
            this.lastDir = dir;
        }

        this.lastY = shakerWorldPos.y;

    }

});

// Legacy salt prototype kept for reference.
// AFRAME.registerComponent("salt", {
//   init: function () {
//     const start = this.el.getAttribute("position");
//     const scene = this.el.sceneEl;
//     this.el.addEventListener("click", () => {
//       const pan = document.querySelector("#pan");
//       const p = pan.getAttribute("position");
//       this.el.setAttribute("animation__move", `property:position;to:${p.x} ${p.y+0.35} ${p.z};dur:400`);
//       this.el.setAttribute("animation__shake", "property:rotation;to:0 0 180;dir:alternate;dur:200;loop:4");
//       spawnSalt(scene);
//       actions.saltShakes++;
//       setTimeout(() => {
//         this.el.setAttribute("position", start);
//         this.el.setAttribute("rotation", "0 0 0");
//       }, 1200);
//     });
//   }
// });

// ===== SALT SPAWN =====
function spawnSaltGrains(scene) {

    const pan = document.querySelector("#pan");
    const pos = pan.getAttribute("position");

    for (let i = 0; i < 12; i++) {

        const grain = document.createElement("a-sphere");
        grain.setAttribute("salt-grain", "");
        grain.setAttribute("radius", "0.01");
        grain.setAttribute("color", "white");

        const x = pos.x + (Math.random() * 0.2 - 0.1);
        const z = pos.z + (Math.random() * 0.2 - 0.1);

        grain.setAttribute("position", `${x} ${pos.y + 0.3} ${z}`);
        grain.setAttribute("animation", `property:position;to:${x} ${pos.y} ${z};dur:600`);

        scene.appendChild(grain);

    }

}

// ===== SPOON =====
AFRAME.registerComponent("spoon", {

    init: function () {
        this.lastPos = null;
        this.cooldown = 0;
    },

    tick: function (time) {

        const pan = document.querySelector("#pan");

        const spoonWorldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(spoonWorldPos);

        const panWorldPos = new THREE.Vector3();
        pan.object3D.getWorldPosition(panWorldPos);

        const dist = spoonWorldPos.distanceTo(panWorldPos);
        if (dist > 0.8) return;

        const pos = spoonWorldPos;
        if (!this.lastPos) {
            this.lastPos = {x: pos.x, z: pos.z};
            return;
        }

        const moveX = Math.abs(pos.x - this.lastPos.x);
        const moveZ = Math.abs(pos.z - this.lastPos.z);

        if ((moveX > 0.02 || moveZ > 0.02) && time - this.cooldown > 400) {
            actions.stirs++;
            console.log("Roeren:", actions.stirs);
            this.cooldown = time;
        }

        this.lastPos = {x: pos.x, z: pos.z};

    }

});

// Legacy spoon prototype kept for reference.
// AFRAME.registerComponent("spoon", {
//   init: function () {
//     const start = this.el.getAttribute("position");
//     const pan = document.querySelector("#pan");
//     const pos = pan.getAttribute("position");
//     this.el.addEventListener("click", () => {
//       this.el.setAttribute("animation__move", `property:position;to:${pos.x} ${pos.y+0.2} ${pos.z};dur:400`);
//       setTimeout(() => {
//         this.el.setAttribute("animation__stir", `property:rotation;to:0 360 0;dur:800`);
//         actions.stirs++;
//       }, 400);
//       setTimeout(() => {
//         this.el.setAttribute("position", start);
//         this.el.setAttribute("rotation", "0 0 0");
//       }, 1500);
//     });
//   }
// });
