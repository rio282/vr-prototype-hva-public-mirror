export function registerComponentDesktopMouseDrag() {
	window.addEventListener("contextmenu", (e) => e.preventDefault());
	AFRAME.registerComponent("mouse-drag", {
		horizontalObjectViewOffset: 0.67,

		init: function () {
			this.camera = document.querySelector("#camera");

			// tracks which objects are being held
			this.held = {
				0: null, // left mouse
				2: null  // right mouse
			};

			this.el.addEventListener("mousedown", (e) => {
				const button = e.detail.mouseEvent?.button;
				if (!(button in this.held)) return;

				// already holding something with this button
				if (this.held[button]) return;
				this.held[button] = this.el;

				// fire grab event
				this.el.emit("grab-start", { hand: this.el }, false);

				// temporarily remove physics
				if (this.el.body) this.el.removeAttribute("dynamic-body");

				this.camera.object3D.add(this.el.object3D);

				// different positions for left/right
				if (button === 0) this.el.object3D.position.set(-this.horizontalObjectViewOffset, -0.5, -0.8);
				else if (button === 2) this.el.object3D.position.set(this.horizontalObjectViewOffset, -0.5, -0.8);
			});

			this.el.sceneEl.addEventListener("mouseup", (e) => {
				// get correct object & clear it from held
				const heldEl = this.held[e.button];
				if (!heldEl) return;
				this.held[e.button] = null;

				// fire grab has ended event
				this.el.emit("grab-end", {hand: this.el}, false);

				// update world positions
				const worldPos = new THREE.Vector3();
				heldEl.object3D.getWorldPosition(worldPos);

				this.el.sceneEl.object3D.add(heldEl.object3D);
				heldEl.object3D.position.copy(this.el.sceneEl.object3D.worldToLocal(worldPos));

				// re-add dynamic body
				if (!heldEl.getAttribute("dynamic-body")) heldEl.setAttribute("dynamic-body", "");

				// update body positions
				if (!heldEl.body) return;
				heldEl.body.position.copy(worldPos);
				heldEl.body.velocity.set(0, 0, 0);
				heldEl.body.angularVelocity.set(0, 0, 0);
				heldEl.body.wakeUp();
			});
		}
	});
}
