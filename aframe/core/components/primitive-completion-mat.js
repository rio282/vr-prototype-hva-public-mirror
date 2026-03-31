AFRAME.registerComponent("primitive-completion-mat", {
	init: function () {
		this.player = this.el.sceneEl.querySelector("#player");

		this.matPos = new THREE.Vector3();
		this.playerPos = new THREE.Vector3();

		this.triggered = false;
		this.radius = 0.75;
	},

	tick: function () {
		if (!this.player || this.triggered) return;  // NOTE: not reusable, can only fire once for now

		this.el.object3D.getWorldPosition(this.matPos);
		this.player.object3D.getWorldPosition(this.playerPos);

		const dx = this.playerPos.x - this.matPos.x;
		const dz = this.playerPos.z - this.matPos.z;
		const distanceSq = dx * dx + dz * dz;

		if (distanceSq <= this.radius * this.radius) {
			this.triggered = true;
			this.el.sceneEl.emit("end-game", {timestamp: Date.now()});
		}
	}
});
