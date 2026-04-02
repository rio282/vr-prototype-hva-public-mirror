import "@/js/utils/string.js";
import {REGISTRY} from "@/aframe/core/mechanics/quest-system";

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
		// yeah I mean I'm running out of time alright...
		const ACTION_LABELS = {
			[Objective.TYPE.COLLECT]: "Verzamel",
			[Objective.TYPE.CUT]: "Snij",
		};

		const lookupItemText = () => Object.values(REGISTRY).find(item => item.id === this.item)?.text ?? "Onbekend";

		return `${ACTION_LABELS[this.type] ?? "Onbekend"} ${lookupItemText()}`.toTitleCase();
	}
}
