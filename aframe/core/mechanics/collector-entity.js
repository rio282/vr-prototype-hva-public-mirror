import {Objective} from "@/aframe/core/models/objective.js";

AFRAME.registerComponent("collector-entity", {
	schema: {
		collectionDistance: {type: "number", default: 1.5},
		updateInterval: {type: "number", default: 1 / 20 * 1000} // ms
	},

	init: function () {
		this.ticks = 0;
		this.tick = AFRAME.utils.throttleTick(this.tick, this.data.updateInterval, this);
	},

	tick: function () {
		this.el.sceneEl.querySelectorAll(".grabbable").forEach((entity) => {
			if (this.el.id === entity.id) return;
			const distance = this.el.object3D.position.distanceTo(entity.object3D.position);
			if (distance <= this.data.collectionDistance) this.onItemCollect(entity);
		});
		this.ticks++;
	},

	onItemCollect(item) {
		this.el.sceneEl.emit(Objective.TYPE.COLLECT, {
			type: item.id.split("-")[0],
			tick: this.ticks,
			timestamp: Date.now(),
		});
		item.remove();
	},
});
