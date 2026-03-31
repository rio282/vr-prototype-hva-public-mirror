import {QuestSystem, getRandomQuestItem} from "@/aframe/core/mechanics/quest-system";
import {DEFAULT_RACK_PROPS} from "../generators/grocery-store-layout-generator";

AFRAME.registerComponent("primitive-grocery-rack", {
		maxItemsOnShelf: 1,
		maxShelfItemSpawnAttempts: 1,

		schema: {
			width: {type: "number", default: 6},
			height: {type: "number", default: 2},
			depth: {type: "number", default: 2},
			shelfSpacing: {type: "number", default: 0.8},
		},

		init: function () {
			this.shelves = [];
			this.category = getRandomQuestItem();

			this.currentPhase = 0;
			this.phases = Object.freeze([
				this.phase0_generateShelves.bind(this),
				this.phase1_generateItems.bind(this),
			]);
		},

		tick: function () {
			// phase-tick system --> see primitive-grocery-store.js for comments I GUESS
			if (this.currentPhase >= this.phases.length) return;
			const nextPhase = this.phases[this.currentPhase];
			nextPhase();
			this.currentPhase++;
		},

		/**
		 * Builds... the... shelves... (?)
		 */
		phase0_generateShelves() {
			const {width: rw, height: rh, depth: rd, shelfSpacing: spacing} = this.data;
			const pw = this.el.querySelector(".rack-pillar").getAttribute("width");

			const maxShelves = Math.floor(rh / spacing);
			const shelves = Math.floor(Math.random() * (maxShelves)) + 1;

			for (let s = 1; s <= shelves; s++) {
				const y = spacing * s;  // NOTE: maybe improve in the future?

				const shelf = document.createElement("a-box");
				shelf.setAttribute("width", rw - pw * 2);
				shelf.setAttribute("height", "0.05");
				shelf.setAttribute("depth", rd);
				shelf.setAttribute("position", `0 ${y} 0`);
				shelf.setAttribute("color", "white");
				shelf.setAttribute("static-body", "shape: box");

				this.el.appendChild(shelf);
				this.shelves.push(shelf);
			}
		},

		phase1_generateItems() {
			this.shelves.forEach(shelf => {
				for (let item = 0; item < this.maxItemsOnShelf; item++) this.trySpawnItemOnShelf(shelf)
			});
		},

		/**
		 * Attempts to spawn a single item on a shelf, retrying up to the configured limit.
		 *
		 * @param {Element} shelf - Shelf entity.
		 * @returns {void}
		 */
		trySpawnItemOnShelf(shelf) {
			let location;
			for (let attempts = 0; attempts < this.maxShelfItemSpawnAttempts; attempts++) {
				if ((location = this.findSuitableSpawnLocationOnShelf(shelf))) {
					QuestSystem.spawnItemAt(
						this.category,
						location,
						true
					);
					return;
				}
			}
			console.warn(`Failed to spawn item: ${this.category} after ${this.maxShelfItemSpawnAttempts} attempt(s).`);
		},

		/**
		 * Finds a valid spawn location on a shelf.
		 *
		 * @param {Element} shelf - Shelf entity.
		 * @returns {{x: number, y: number, z: number} | false} A valid position object or false if none found.
		 */
		findSuitableSpawnLocationOnShelf(shelf) {
			if (!shelf) return false;

			// shelf dimensions
			const sh = parseFloat(shelf.getAttribute("height"));
			const sw = parseFloat(shelf.getAttribute("width"));
			shelf.object3D.updateMatrixWorld(true);  // ensure matrix is up to date

			const itemSpacing = 0.01;
			const itemWidth = 1;  // TODO: grab width from table

			const halfShelf = sw / 2;
			const startX = -halfShelf + itemWidth / 2;
			const endX = halfShelf - itemWidth / 2;

			// TODO: fix this for-loop
			for (let offset = startX; offset <= endX; offset += (itemWidth + itemSpacing)) {
				// position in shelf-local space
				const localPos = new THREE.Vector3(
					offset,
					sh + 0.1,  // to avoid accidental collision with the shelf
					0
				);

				// convert to world space (handles rotation automatically)
				const worldPos = localPos.clone().applyMatrix4(shelf.object3D.matrixWorld);

				return {
					x: worldPos.x,
					y: worldPos.y,
					z: worldPos.z
				};
			}

			// couldn't find a valid spawning-space
			return false;
		},
	}
);
