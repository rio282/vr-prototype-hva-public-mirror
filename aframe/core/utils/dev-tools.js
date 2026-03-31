import {DEBUG_MODE, keymap} from "@/aframe/settings.js";
import {renderKeymapTable} from "@/aframe/core/utils/help-overlay.js";

function _createNavPointer() {
	/**
	 * TODO: write documentation about this
	 */
	AFRAME.registerComponent("nav-pointer", {
		overlay: null,

		init: function () {
			this.overlay = document.getElementById("debug-overlay");

			const el = this.el;
			el.addEventListener("click", (e) => {
				const {x, y, z} = e.detail.intersection.point;
				console.debug(
					`[${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`,
				);
			});

			// refresh the raycaster after models load.
			el.sceneEl.addEventListener("object3dset", () =>
				this.el.components.raycaster.refreshObjects(),
			);
		},

		tick: function () {
			if (!this.overlay) return;

			const raycaster = this.el.components.raycaster;
			if (!raycaster) return;

			const intersections = raycaster.intersections;
			if (!intersections || intersections.length === 0) {
				this.overlay.innerText = "Looking At: <none>";
				return;
			}

			const intersection = intersections[0];

			const {x, y, z} = intersection.point;
			const distance = intersection.distance;
			const object = intersection.object.name;

			this.overlay.innerText = `Looking At:
x: ${x.toFixed(2)}
y: ${y.toFixed(2)}
z: ${z.toFixed(2)}
distance: ${distance.toFixed(2)}
object: ${object}`;
		},

		remove: function () {
			if (this.overlay) this.overlay.remove();
			document.querySelector("#info-debug-mode-toggled")?.remove();
		},
	});
}

/**
 * Note: Calls _createNavPointer internally.
 */
export function addCustomDevTools(createNavPointer = false) {
	if (createNavPointer) _createNavPointer();

	const debugModeToggledOnOverlay = document.createElement("div");
	debugModeToggledOnOverlay.id = "info-debug-mode-toggled";
	debugModeToggledOnOverlay.className = `
		position-fixed
		top-0
		start-50
		translate-middle-x
		mt-3
		px-3
		py-2
		bg-dark
		bg-opacity-75
		text-white
		font-monospace
		small
		lh-sm
		rounded
		shadow
	`;
	debugModeToggledOnOverlay.style.whiteSpace = "pre";
	debugModeToggledOnOverlay.style.zIndex = "1080";
	debugModeToggledOnOverlay.innerText = "DEBUG MODE";
	if (DEBUG_MODE) document.body.appendChild(debugModeToggledOnOverlay);

	const debugOverlay = document.createElement("div");
	debugOverlay.id = "debug-overlay";
	debugOverlay.className = `
		position-fixed
		top-0
		end-0
		mt-3
		me-3
		px-3
		py-2
		bg-dark
		bg-opacity-75
		text-white
		font-monospace
		small
		lh-sm
		rounded
		shadow
	`;
	debugOverlay.style.whiteSpace = "pre";
	debugOverlay.style.zIndex = "1080";
	debugOverlay.innerText = "Looking At: <none>";
	if (DEBUG_MODE && createNavPointer) document.body.appendChild(debugOverlay);

	const view = document.querySelector("#view");
	const scene = view.querySelector("a-scene");
	document.addEventListener("keypress", (event) => {
		switch (event.key) {
			case keymap.toggleStats:
				if (!scene) return;
				// `.toggleAttribute()` doesn't work on an `<a-scene>` element...
				if (scene.hasAttribute("stats")) scene.removeAttribute("stats");
				else scene.setAttribute("stats", "");
				break;
			case keymap.toggleNavMeshOverlay:
				const navmesh = view.querySelector("[nav-mesh]");  // here because it might not be initialized yet when addCustomDevTools() is called
				if (!navmesh) return;
				navmesh.setAttribute(
					"visible",
					(!navmesh.getAttribute("visible")).toString(),
				);
				break;
			case keymap.help:
				renderKeymapTable(keymap);
				break;
			default:
				break;
		}
	});
}
