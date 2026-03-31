AFRAME.registerComponent("directional-ui", {
	schema: {
		threshold: {type: "number", default: 0.67},  // look-down
		hysteresis: {type: "number", default: 0.1},  // prevent flickering
		heightFromGround: {type: "number", default: 0.75},
		horizontalDistanceFromPlayer: {type: "number", default: 0.5},
		fadeSpeed: {type: "number", default: 0.05}
	},

	init: function () {
		this.cameraEl = null;
		this.lookDirection = new THREE.Vector3();
		this.isUIVisible = false;

		// initially fully invisible
		this.el.object3D.visible = true;
		this._setOpacity(100);

		this.el.sceneEl.addEventListener("loaded", () => {
			this.cameraEl = this.el.sceneEl.camera?.el;
		});
	},

	tick: function () {
		if (!this.cameraEl) return;

		// camera look direction
		this.cameraEl.object3D.getWorldDirection(this.lookDirection);
		const lookY = this.lookDirection.y;

		// visibility logic
		if (!this.isUIVisible && lookY > this.data.threshold) {
			this.isUIVisible = true;
		} else if (this.isUIVisible && lookY < (this.data.threshold - this.data.hysteresis)) {
			this.isUIVisible = false;
		}

		// player position
		const playerPos = new THREE.Vector3();
		this.cameraEl.object3D.getWorldPosition(playerPos);

		// forward vector
		const forward = new THREE.Vector3();
		this.cameraEl.object3D.getWorldDirection(forward);
		forward.y = 0;
		forward.normalize();

		// target position
		const target = playerPos.clone().add(forward.multiplyScalar(-this.data.horizontalDistanceFromPlayer));
		target.y = this.data.heightFromGround;

		// look at position
		const lookAtPos = playerPos.clone();
		lookAtPos.y = 1.75;

		// update position & rotation
		this.el.object3D.position.copy(target);
		this.el.object3D.lookAt(lookAtPos);

		// fade in/out
		const currentOpacity = this._getOpacity();
		const targetOpacity = this.isUIVisible ? 1 : 0;

		// lerp vs LARP (https://www.urbandictionary.com/define.php?term=LARP)
		const newOpacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, this.data.fadeSpeed);
		this._setOpacity(newOpacity);
	},

	// set opacity for meshes and text components
	_setOpacity: function (value) {
		this.el.object3D.traverse(child => {
			// update mesh material
			if (child.material) {
				child.material.transparent = true;
				child.material.opacity = value;
			}
		});

		// update aframe text components
		this.el.querySelectorAll("[text]").forEach(textEl => {
			const textComp = textEl.getAttribute("text");
			textEl.setAttribute("text", {...textComp, opacity: value});  // yo chatgpt, thanks for this beautiful line
		});
	},

	// get current opacity (first mesh or text found)
	_getOpacity: function () {
		let opacity = 0;

		this.el.object3D.traverse(child => {
			if (child.material && child.material.opacity != null && opacity === 0) opacity = child.material.opacity;
		});

		if (opacity === 0) {
			const textEl = this.el.querySelector("[text]");
			if (textEl) opacity = textEl.getAttribute("text").opacity || 0;
		}

		return opacity;
	}
});
