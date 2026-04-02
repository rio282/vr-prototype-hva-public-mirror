/**
 * NGL, this is mostly ai-generated with some minor tweaks. i didn't have time to fully implement everything...
 */
export function registerComponentVrHandGrab() {
	AFRAME.registerComponent("vr-hand-grab", {
		schema: {
			touchRadius: {type: "number", default: 0.24},
			palmX: {type: "number", default: 0},
			palmY: {type: "number", default: -0.02},
			palmZ: {type: "number", default: -0.12}
		},

		init: function () {
			this.heldEl = null;
			this.hadDynamic = false;
			this.savedDynamic = "";
			this.wasGrabPressed = false;

			this.onPress = this.onPress.bind(this);
			this.onRelease = this.onRelease.bind(this);

			this.pressEvents = ["gripdown", "triggerdown", "pinchstarted"];
			this.releaseEvents = ["gripup", "triggerup", "pinchended"];

			this.pressEvents.forEach(evt => this.el.addEventListener(evt, this.onPress));
			this.releaseEvents.forEach(evt => this.el.addEventListener(evt, this.onRelease));
		},

		remove: function () {
			this.pressEvents.forEach(evt => this.el.removeEventListener(evt, this.onPress));
			this.releaseEvents.forEach(evt => this.el.removeEventListener(evt, this.onRelease));
		},

		isGrabPressed: function () {
			let gamepad = null;

			const tracked = this.el.components["tracked-controls"];
			if (tracked?.controller?.gamepad) gamepad = tracked.controller.gamepad;

			const oculus = this.el.components["oculus-touch-controls"];
			if (!gamepad && oculus?.controller?.gamepad) gamepad = oculus.controller.gamepad;

			if (!gamepad?.buttons) return false;

			const btns = gamepad.buttons;
			return (btns[0]?.pressed || btns[1]?.pressed) ?? false;
		},

		distanceToObject: function (handPos, el) {
			if (!el?.object3D?.visible) return Infinity;

			const box = new THREE.Box3().setFromObject(el.object3D);
			if (!isFinite(box.min.x)) return Infinity;

			const closest = box.clampPoint(handPos, new THREE.Vector3());
			return handPos.distanceTo(closest);
		},

		findTouchTarget: function () {
			const handPos = new THREE.Vector3();
			this.el.object3D.getWorldPosition(handPos);

			let best = null;
			let bestD = this.data.touchRadius;

			this.el.sceneEl.querySelectorAll(".grabbable").forEach(el => {
				if (el.dataset?.vrHeldBy) return;

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
			target.dataset.vrHeldBy = this.el.id || "hand";
			target.emit("grab-start", {hand: this.el}, false);

			// Store physics state
			this.hadDynamic = target.hasAttribute("dynamic-body");
			if (this.hadDynamic) {
				this.savedDynamic = target.getAttribute("dynamic-body");
				target.removeAttribute("dynamic-body");
			}

			// Determine grab offset
			let grabPoint = target.querySelector("#grab-point");
			let offsetX = this.data.palmX;
			let offsetY = this.data.palmY;
			let offsetZ = this.data.palmZ;

			if (grabPoint) {
				const pos = grabPoint.object3D.position;
				offsetX = pos.x;
				offsetY = pos.y;
				offsetZ = pos.z;
			}

			// Attach to hand
			this.el.object3D.add(target.object3D);
			target.object3D.position.set(offsetX, offsetY, offsetZ);
			target.object3D.rotation.set(0, 0, 0);
		},

		drop: function () {
			if (!this.heldEl) return;

			const target = this.heldEl;
			target.emit("grab-end", {hand: this.el}, false);

			// Preserve world transform
			const scene = this.el.sceneEl;
			const worldPos = new THREE.Vector3();
			const worldQuat = new THREE.Quaternion();

			target.object3D.getWorldPosition(worldPos);
			target.object3D.getWorldQuaternion(worldQuat);

			scene.object3D.add(target.object3D);
			target.object3D.position.copy(worldPos);
			target.object3D.quaternion.copy(worldQuat);

			// Restore physics if it existed
			if (this.hadDynamic) {
				target.setAttribute("dynamic-body", this.savedDynamic || "mass:1");

				// Reset velocity to avoid unnatural motion
				setTimeout(() => {
					if (target.body) {
						target.body.velocity.set(0, 0, 0);
						target.body.angularVelocity.set(0, 0, 0);
					}
				}, 50);
			}

			this.heldEl = null;
			delete target.dataset.vrHeldBy;
			this.hadDynamic = false;
			this.savedDynamic = "";
		},

		onPress: function () {
			if (this.heldEl) return;

			const target = this.findTouchTarget();
			if (target) this.attach(target);
		},

		onRelease: function () {
			this.drop();
		},

		tick: function () {
			const hand = this.el;

			if (window.vrMode === "menu") {
				// Enable laser raycaster for UI
				hand.setAttribute(
					"raycaster",
					"objects: .clickable; far: 4.5; showLine: true; enabled: true"
				);
				hand.setAttribute("line", "color: #9ee7ff; opacity: 0.95");

				// Prevent grabbing objects in menu mode
				if (this.heldEl) this.drop();
			} else {
				// Grab mode: disable laser, enable grabbing
				hand.setAttribute(
					"raycaster",
					"objects: .grabbable; far: 2.5; showLine: false; enabled: false"
				);
				hand.removeAttribute("line");

				// Handle grab input
				const pressed = this.isGrabPressed();
				if (pressed && !this.wasGrabPressed) this.onPress();
				if (!pressed && this.wasGrabPressed) this.onRelease();
				this.wasGrabPressed = pressed;

				// Keep held object aligned
				if (this.heldEl) {
					let offsetX = this.data.palmX;
					let offsetY = this.data.palmY;
					let offsetZ = this.data.palmZ;
					const grabPoint = this.heldEl.querySelector("#grab-point");
					if (grabPoint) {
						const pos = grabPoint.object3D.position;
						offsetX = pos.x;
						offsetY = pos.y;
						offsetZ = pos.z;
					}
					this.heldEl.object3D.position.set(offsetX, offsetY, offsetZ);
					this.heldEl.object3D.rotation.set(0, 0, 0);
				}
			}
		}
	});
}
