import "@/js/utils/string.js";

export class Objective {
	static TYPE = Object.freeze({
		COLLECT: "item-collect",
		CUT: "item-cut",
	});

	#completedAt;

	constructor({type, item, goal = 1, progress = 0}) {
		this.type = type;
		this.item = item;
		this.goal = goal;
		this.progress = progress;
	}

	advance(overflowIsOk = false) {
		if (overflowIsOk) this.progress++;
		else if (this.progress < this.goal) this.progress++;
		if (this.isCompleted()) this.#setCompletedAt(Date.now());
	}

	#setCompletedAt(timestamp) {
		this.#completedAt = timestamp;
	}

	isCompleted() {
		return this.progress >= this.goal;
	}

	getCompletedTimestamp() {
		return this.#completedAt || false;
	}

	toString() {
		return `${this.type.split("-").pop()} ${this.goal} ${this.item}${this.goal > 1 ? "s" : ""}`.toTitleCase();
	}
}
