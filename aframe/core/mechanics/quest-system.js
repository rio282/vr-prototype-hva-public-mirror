import {playSoundOnEntity} from "../utils/audio-utils";

require("aframe");
import "@/js/utils/array.js";
import {Quest} from "@/aframe/core/models/quest.js";
import {Objective} from "@/aframe/core/models/objective.js";
import {AmbientAudio} from "@/aframe/core/utils/audio-utils.js";
import {randomObjectId} from "@/aframe/core/utils/generators.js";

// TODO: move?
export const REGISTRY = Object.freeze({
	WATERMELON: {
		id: "watermelon",
		size: 4.25,
		shape: "box",
		mass: 1,
		linearDamping: 0.1,
		angularDamping: 0.1,
	},
	CABBAGE: {
		id: "cabbage",
		size: 3,
		shape: "box",
		mass: 0.5,
		linearDamping: 0.3,
		angularDamping: 0.3,
	},
	LEMON: {
		id: "lemon",
		size: 3,
		shape: "box",
		mass: 0.1,
		linearDamping: 0.1,
		angularDamping: 0.3,
	},
});

export const quests = [
	new Quest({
		id: "test-quest",
		title: "Test Quest",
		description: "This is a Test Quest!",
		status: Quest.STATUS.AVAILABLE,
		objectives: [
			new Objective({
				type: Objective.TYPE.COLLECT,
				item: REGISTRY.WATERMELON.id,
				goal: 1,
				progress: 0,
			}),
			new Objective({
				type: Objective.TYPE.COLLECT,
				item: REGISTRY.LEMON.id,
				goal: 2,
				progress: 0,
			}),
			new Objective({
				type: Objective.TYPE.COLLECT,
				item: REGISTRY.CABBAGE.id,
				goal: 1,
				progress: 0,
			}),
		],
	}),
];


/**
 * NOTE: YES, I used ChatGPT for the JSDocs. However, I did check everything and made minor adjustments.
 *
 * Manages the lifecycle and progression of a single quest instance.
 *
 * The QuestSystem is responsible for:
 * - Starting quests
 * - Advancing objectives
 * - Completing or failing quests
 * - Reporting objective progress
 * - Spawning quest-related items in the scene
 *
 * It operates on a validated {@link Quest} instance that must already exist
 * in the global `quests` table.
 */
export class QuestSystem {
	#quest;

	/**
	 * Creates a new QuestSystem for a specific quest.
	 *
	 * @param {Quest} quest - The quest instance this system should manage.
	 * @throws {TypeError} If the provided quest is not an instance of {@link Quest}.
	 * @throws {TypeError} If the quest does not exist in the global `quests` table.
	 */
	constructor(quest) {
		if (!(quest instanceof Quest)) throw new TypeError("'quest' must be an instance of Quest.");
		if (!quests.includes(quest)) throw new TypeError("'quest' must exist in the 'quests'-table.");
		this.#quest = quest;
	}

	/**
	 * Starts the quest.
	 * Calls the underlying quest's `start()` method and logs the action.
	 *
	 * @returns {void}
	 */
	startQuest() {
		console.debug(`Started quest: ${this.#quest.title}`);
		this.#quest.start();
	}

	/**
	 * Advances progress for a specific objective in the quest.
	 *
	 * Validates that the quest is currently in progress and that the
	 * objective index is valid. After advancing the objective, the
	 * method checks whether all objectives are completed and will
	 * automatically complete the quest if so.
	 *
	 * @param {number} index - The index of the objective to advance.
	 * @throws {Error} If the quest is not currently in progress.
	 * @throws {Error} If the objective index is out of bounds.
	 * @returns {void}
	 */
	advanceObjective(index) {
		if (this.#quest.status !== Quest.STATUS.IN_PROGRESS) throw new Error("Quest must be in progress.");
		if (index < 0 || index >= this.#quest.objectives.length) throw new Error("Invalid objective index.");

		const obj = this.#quest.objectives[index];
		obj.advance();

		console.debug(`Objective progress: ${obj.item} (${obj.progress}/${obj.goal}) in quest "${this.#quest.title}"`);

		if (this.#quest.objectives.every((o) => o.isCompleted())) this.completeQuest();
	}

	/**
	 * Completes the quest.
	 * Calls the underlying quest's `complete()` method and logs the completion.
	 *
	 * @returns {void}
	 */
	completeQuest() {
		console.debug(`Completed quest: ${this.#quest.title}`);
		this.#quest.complete();
	}

	/**
	 * Fails the quest.
	 *
	 * The quest must currently be in progress. When a quest fails,
	 * all objective progress is reset to zero.
	 *
	 * @throws {Error} If the quest is not currently in progress.
	 * @returns {void}
	 */
	failQuest() {
		if (this.#quest.status !== Quest.STATUS.IN_PROGRESS)
			throw new Error("Quest must be in progress to fail.");

		console.debug(
			`Failed quest: ${this.#quest.title} (${this.getObjectiveProgress()}/${this.#quest.objectives.length})`,
		);
		this.#quest.fail();
		this.#quest.objectives.forEach((o) => (o.progress = 0)); // reset objectives
	}

	/**
	 * Returns the quest instance managed by this system.
	 *
	 * @returns {Quest} The current quest instance.
	 */
	getQuest() {
		return this.#quest;
	}

	/**
	 * Returns completion status for all objectives.
	 *
	 * Each element in the returned array corresponds to an objective
	 * and indicates whether it has been completed.
	 *
	 * @returns {boolean[]} An array of objective completion states.
	 */
	getObjectiveProgress() {
		return this.#quest.objectives.map((o) => o.isCompleted());
	}

	/**
	 * Returns a formatted summary of objective progress.
	 *
	 * The summary includes each objective item along with its current
	 * progress and goal value.
	 *
	 * Example output:
	 * `"apple: 2/5, bread: 1/3"`
	 *
	 * @returns {string} A human-readable summary of objective progress.
	 */
	getObjectiveProgressSummary() {
		return this.#quest.objectives
			.map((o) => `${o.item}: ${o.progress}/${o.goal}`)
			.join(", ");
	}

	/**
	 * Spawns an item entity at a specified position in the A-Frame scene.
	 *
	 * A new `<a-entity>` is created with the provided component type and
	 * positioned at the specified coordinates before being appended to
	 * the active `<a-scene>`. An optional scale parameter can be provided
	 * to control the size of the spawned entity. If omitted, the entity
	 * will use the default scale of `1 1 1`.
	 *
	 * @param {string} itemId - The component or item type to attach to the entity.
	 * @param {{x: number, y: number, z: number}} position - The spawn position.
	 * @param {number} position.x - X coordinate.
	 * @param {number} position.y - Y coordinate.
	 * @param {number} position.z - Z coordinate.
	 * @param {Boolean} silent - If silent, we don't print the debug message
	 * @returns {void}
	 */
	static spawnItemAt(
		itemId,
		{x, y, z},
		silent = false
	) {
		if (!silent) {
			// i would prefer to not constantly get spammed...
			const [fx, fy, fz] = [x, y, z].map(v => v.toFixed(2));
			console.debug(`Spawning item '${itemId}' at:<br>[${fx}, ${fy}, ${fz}]`);
		}

		// create entity element
		const entity = document.createElement("a-entity");
		entity.setAttribute("id", `${itemId.toLowerCase()}-${randomObjectId()}`);  // object id
		entity.setAttribute("gltf-model", `#${itemId}`);
		entity.setAttribute("position", `${x} ${y} ${z}`);
		entity.setAttribute("mouse-drag", "");
		entity.setAttribute("grabbable", "");
		entity.classList.add("grabbable");

		// get properties from item registry
		const props = REGISTRY[itemId.toUpperCase()];

		// set scale
		const scale = props?.size ?? 1;
		entity.setAttribute("scale", `${scale} ${scale} ${scale}`);

		// wait before adding dynamic body - (prevent body.js bug that somehow causes a tick delay with audio causing a crash)
		entity.addEventListener("model-loaded", () => {
			entity.setAttribute(
				"dynamic-body",
				props
					? `shape: ${props.shape}; mass: ${props.mass}; linearDamping: ${props.linearDamping}; angularDamping: ${props.angularDamping};`
					: "shape: box;"
			);
		});

		// add event listener
		entity.addEventListener("grab-start", (e) => playSoundOnEntity(entity, itemId));
		entity.addEventListener("grab-end", (e) => playSoundOnEntity(entity, itemId));

		// spawn in
		document.querySelector("a-scene").appendChild(entity);
	}
}

// https://aframe.io/docs/1.7.0/core/systems.html
AFRAME.registerSystem("quest-system", {
	questSystem: null,

	init: function () {
		console.debug("Initializing quest system...");
		this.questSystem = new QuestSystem(quests[0]);
		this.questSystem.startQuest();
		this.addEventListeners();
		this.updateQuestInterface();
		console.debug("Successfully initialized quest system!");

		this.startedAt = Date.now();
	},

	addEventListeners() {
		// NOTE: update as we go
		const scene = document.querySelector("a-scene");

		scene.addEventListener(Objective.TYPE.COLLECT, (event) => {
			const quest = this.questSystem.getQuest();
			if (!quest.isActive() || quest.isCompleted()) return;

			const itemType = event.detail.type;
			const qs = this.questSystem;

			qs.getQuest().objectives.forEach((objective, index) => {
				if (objective.type !== Objective.TYPE.COLLECT) return;
				if (objective.item === itemType) {
					qs.advanceObjective(index);
					this.updateQuestInterface();
				}
			});
		});

		scene.addEventListener("end-game", (event) => {
			// stop audio omg...
			AmbientAudio.stop();

			// calc score/stars
			const maxStars = 3;
			const timeLimit = 5 * 60 * 1000;  // 5 mins
			const formattedTimeString = (ms) => {
				const totalSeconds = Math.floor(ms / 1000);
				const hours = Math.floor(totalSeconds / 3600);
				const minutes = Math.floor((totalSeconds % 3600) / 60);
				const seconds = totalSeconds % 60;
				return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			};

			const totalTime = event.detail.timestamp - this.startedAt;
			let stars = maxStars;

			if (totalTime > timeLimit) stars = 0;
			else {
				this.questSystem.getQuest().objectives.forEach((objective) => {
					if (!objective.isCompleted()) stars -= 1;
				});
				stars = Math.max(0, Math.min(maxStars, stars));
			}

			// generate ending screen
			const camera = scene.querySelector("[camera]");

			camera.parentElement.removeAttribute("movement-controls");
			camera.removeAttribute("look-controls");
			camera.setAttribute("animation__rot", {
				property: "rotation",
				to: "0 5 0",
				dur: 500
			});

			const endScreen = document.createElement("a-entity");
			endScreen.setAttribute("position", "0 0 -1.5"); // in front of camera

			const bg = document.createElement("a-plane");
			bg.setAttribute("width", "2");
			bg.setAttribute("height", "1.5");
			bg.setAttribute("color", "#111");
			bg.setAttribute("opacity", "0.9");

			const title = document.createElement("a-text");
			title.setAttribute("value", "Game Finished");
			title.setAttribute("align", "center");
			title.setAttribute("position", "0 0.5 0.01");
			title.setAttribute("width", "2");

			const timeText = document.createElement("a-text");
			timeText.setAttribute("value", `Time: ${formattedTimeString(totalTime)}`);
			timeText.setAttribute("align", "center");
			timeText.setAttribute("position", "0 0.2 0.01");
			timeText.setAttribute("width", "2");

			const starsContainer = document.createElement("a-entity");
			starsContainer.setAttribute("position", "0 -0.1 0.01");

			const spacing = 0.3;
			const startX = -((maxStars - 1) * spacing) / 2;

			for (let i = 0; i < maxStars; i++) {
				const star = document.createElement("a-image");

				star.setAttribute("src", i < stars ? "#filled-star" : "#empty-star");
				star.setAttribute("width", "0.25");
				star.setAttribute("height", "0.25");

				star.setAttribute("position", `${startX + i * spacing} 0 0`);

				starsContainer.appendChild(star);
			}

			const restartBtn = document.createElement("a-plane");
			restartBtn.setAttribute("width", "0.6");
			restartBtn.setAttribute("height", "0.25");
			restartBtn.setAttribute("color", "#4CAF50");
			restartBtn.setAttribute("position", "-0.4 -0.5 0.01");
			restartBtn.classList.add("clickable");
			restartBtn.addEventListener("click", () => location.reload());  // reload ig

			const restartText = document.createElement("a-text");
			restartText.setAttribute("value", "Restart");
			restartText.setAttribute("align", "center");
			restartText.setAttribute("position", "0 0 0.01");
			restartText.setAttribute("width", "2");

			restartBtn.appendChild(restartText);

			const exitBtn = document.createElement("a-plane");
			exitBtn.setAttribute("width", "0.6");
			exitBtn.setAttribute("height", "0.25");
			exitBtn.setAttribute("color", "#f44336");
			exitBtn.setAttribute("position", "0.4 -0.5 0.01");
			exitBtn.classList.add("clickable");
			exitBtn.addEventListener("click", () => (window.location.href = "/"));

			const exitText = document.createElement("a-text");
			exitText.setAttribute("value", "Exit");
			exitText.setAttribute("align", "center");
			exitText.setAttribute("position", "0 0 0.01");
			exitText.setAttribute("width", "2");

			exitBtn.appendChild(exitText);

			endScreen.appendChild(bg);
			endScreen.appendChild(title);
			endScreen.appendChild(timeText);
			endScreen.appendChild(starsContainer);
			endScreen.appendChild(restartBtn);
			endScreen.appendChild(exitBtn);

			camera.appendChild(endScreen);
		});
	},

	updateQuestInterface() {
		const scene = document.querySelector("a-scene");
		const container = scene.querySelector("#quest-ui");
		container.innerHTML = "";

		let yOffset = 0;
		const createText = (value, size = 0.05) => {
			// TODO: figure out how to ACTUALLY change text size
			const text = document.createElement("a-text");
			text.setAttribute("value", value);
			text.setAttribute("color", "white");
			text.setAttribute("align", "center");
			text.setAttribute("width", 1.5);
			text.setAttribute("position", `0 ${yOffset} 0`);
			yOffset -= size;
			return text;
		};

		const quest = this.questSystem.getQuest();

		// title & description
		container.appendChild(createText(quest.title, 0.08));
		container.appendChild(createText(quest.description, 0.06));

		yOffset -= 0.05;

		// completed quest? -> skip generating objectives
		if (quest.isCompleted()) {
			container.appendChild(createText("Quest Completed!", 0.08));
			// container.setAttribute("position", `0 ${-yOffset / 2} -1.5`);  // set before leaving
			return;
		}

		// objectives
		quest.objectives.forEach((objective) => {
			// progress text
			const label = `${objective.toString()} (${objective.progress}/${objective.goal})`;
			container.appendChild(createText(label, 0.05));

			// background bar
			const bgBar = document.createElement("a-plane");
			bgBar.setAttribute("width", 1);
			bgBar.setAttribute("height", 0.03);
			bgBar.setAttribute("color", "#333");
			bgBar.setAttribute("position", `0 ${yOffset} 0`);
			container.appendChild(bgBar);

			// progress bar
			const percent = Math.min(100, Math.floor((objective.progress / objective.goal) * 100));

			const progressBar = document.createElement("a-plane");
			progressBar.setAttribute("width", percent / 100);
			progressBar.setAttribute("height", 0.03);
			progressBar.setAttribute("color", "mediumseagreen");

			// align left
			progressBar.setAttribute("position", `${-(1 - percent / 100) / 2} ${yOffset} 0.001`);

			// rinse & repeat
			container.appendChild(progressBar);
			yOffset -= 0.07;
		});

		// container.setAttribute("position", `0 ${-yOffset / 2} -1.5`);  // set last
	}
});

/**
 * Selects a random quest item from all quest objectives.
 * @returns {string|undefined} A randomly selected item identifier, or undefined if none exist.
 */
export function getRandomQuestItem() {
	return quests
		.flatMap(q => q.objectives
			.flatMap(o => o.item ? [o.item] : [])
		)
		.sample();
}
