export class Quest {
	static STATUS = Object.freeze({
		LOCKED: "locked",
		AVAILABLE: "available",
		IN_PROGRESS: "in_progress",
		COMPLETED: "completed",
		FAILED: "failed",
	});

	constructor({
		id,
		title,
		description = "",
		status = Quest.STATUS.LOCKED,
		objectives = [],
	}) {
		if (!id) throw new Error("Quest requires an id");
		if (!title) throw new Error("Quest requires a title");
		if (!Object.values(Quest.STATUS).includes(status)) {
			throw new Error(`Invalid quest status: ${status}`);
		}

		this.id = id;
		this.title = title;
		this.description = description;
		this.status = status;
		this.objectives = objectives;
	}

	unlock() {
		if (this.status !== Quest.STATUS.LOCKED) return;
		this.status = Quest.STATUS.AVAILABLE;
	}

	start() {
		if (this.status !== Quest.STATUS.AVAILABLE) {
			throw new Error("Quest must be available to start");
		}
		this.status = Quest.STATUS.IN_PROGRESS;
	}

	complete() {
		if (this.status !== Quest.STATUS.IN_PROGRESS) {
			throw new Error("Quest must be in progress to complete");
		}
		this.status = Quest.STATUS.COMPLETED;
	}

	fail() {
		if (this.status !== Quest.STATUS.IN_PROGRESS) {
			throw new Error("Quest must be in progress to fail");
		}
		this.status = Quest.STATUS.FAILED;
	}

	isActive() {
		return this.status === Quest.STATUS.IN_PROGRESS;
	}

	isCompleted() {
		return this.status === Quest.STATUS.COMPLETED;
	}

	// TODO: maybe add json support in the future?
}
