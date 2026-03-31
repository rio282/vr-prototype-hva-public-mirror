// aframe
require("aframe");

/**
 *  "super-hands" stupid hack fix for:
 *  	"Error: The component `grabbable` has been already registered.
 *  	Check that you are not loading two versions of the same component or
 *  	two different components of the same name."
 *  Source: https://github.com/c-frame/aframe-super-hands-component?tab=readme-ov-file#browser
 */
delete AFRAME.components["grabbable"];

require("aframe-extras");
require("@c-frame/aframe-physics-system");
require("super-hands");

// components
require("@/aframe/core/components/primitive-grocery-rack");
require("@/aframe/core/components/primitive-completion-mat.js");
require("@/aframe/core/components/primitive-grocery-store.js");
require("@/aframe/core/mechanics/collector-entity.js");

// debug etc.
import {DEBUG_MODE, ROOM_DIMENSIONS} from "@/aframe/settings.js";
import {redirectConsoleOutputForAFrame} from "@/aframe/core/utils/redirect-console-output.js";
import {addCustomDevTools} from "@/aframe/core/utils/dev-tools.js";
import {registerComponentDesktopMouseDrag} from "@/aframe/core/mechanics/mouse-drag.js";
import {registerComponentVrHandGrab} from "@/aframe/core/mechanics/vr-hand-grab.js";

// etc / environment enhancements
require("@/aframe/core/mechanics/directional-ui.js");
import {AmbientAudio} from "@/aframe/core/utils/audio-utils";

/**
 * Main function to create the environment
 * @constructor
 */
export function GroceryStore() {
	if (DEBUG_MODE) redirectConsoleOutputForAFrame();
	registerComponentDesktopMouseDrag();
	registerComponentVrHandGrab();

	// environment settings
	const store = {
		width: Math.floor(Math.random() * ROOM_DIMENSIONS.max.width) + ROOM_DIMENSIONS.min.width,
		depth: Math.floor(Math.random() * ROOM_DIMENSIONS.max.depth) + ROOM_DIMENSIONS.min.depth,
	};

	// load grocery items
	const preloadAssets = document.createElement("div");
	preloadAssets.id = "assets-temp";

	const groceryModelsToLoad = _getModelFilesFromGroceriesFolder();
	groceryModelsToLoad.forEach(groceryItemFile => {
		const groceryAssetItem = document.createElement("a-asset-item");
		groceryAssetItem.setAttribute("id", groceryItemFile.filename.split(".")[0]);
		groceryAssetItem.setAttribute("src", groceryItemFile.src);
		preloadAssets.appendChild(groceryAssetItem);
	});

	// TODO: re-encode audio files. because right now they're invalid and cause crashes. use ffmpeg & maybe Audacity
	const groceryAudioFilesToLoad = _getAudioFilesFromGroceriesFolder();
	groceryAudioFilesToLoad.forEach(groceryItemFile => {
		const groceryAudio = document.createElement("audio");
		groceryAudio.setAttribute("id",`audio-${groceryItemFile.filename.split(".")[0]}`);
		groceryAudio.setAttribute("src", groceryItemFile.src);
		groceryAudio.setAttribute("crossorigin", "anonymous");
		preloadAssets.appendChild(groceryAudio);
	});

	// update the view
	const view = document.getElementById("view");
	view.innerHTML = `
		<a-scene ${DEBUG_MODE ? "stats" : ""}
			physics="gravity: -9.8; debug: ${DEBUG_MODE.toString()};"
			loading-screen="dotsColor: red; backgroundColor: black;">
				<a-assets>
					<!-- audio -->
					<audio id="audio-ambience-sound" src="aframe/assets/audio/grocery-store-ambience.mp3"></audio>

					<!-- images -->
					<img id="nav-mesh-texture" src="aframe/assets/textures/nav-mesh-texture.png" />
					<img id="filled-star" src="aframe/assets/icons/filled-star.png" />
					<img id="empty-star" src="aframe/assets/icons/empty-star.png" />

					<!-- models -->
					<a-asset-item id="environment" src="aframe/assets/models/environment/grocery_store.glb"></a-asset-item>
					<a-asset-item id="navigation" src="aframe/assets/models/navigation/grocery_store_navmesh.glb"></a-asset-item>
					<a-asset-item id="sliding-door" src="aframe/assets/models/environment/sliding_door.glb"></a-asset-item>
					<a-asset-item id="payment-till" src="aframe/assets/models/environment/payment_till.glb"></a-asset-item>
					<a-asset-item id="exit-sign" src="aframe/assets/models/environment/exit_sign.glb"></a-asset-item>
					<a-asset-item id="plant" src="aframe/assets/models/environment/plant.glb"></a-asset-item>
					<a-asset-item id="basket" src="aframe/assets/models/items/shopping_basket.glb"></a-asset-item>

					<!-- dynamically inserted assets -->
					${preloadAssets.innerHTML}
				</a-assets>

				<a-entity id="quest-ui" directional-ui></a-entity>

				<a-entity
					id="player"
					movement-controls="constrainToNavMesh: true;"
					nav-agent="speed: 5;"
					position="0 0 0">

						<a-entity
							camera
							id="camera"
							look-controls
							position="0 1.6 0">
								<!-- Desktop users -->
								<a-entity
									cursor="rayOrigin: mouse"
									raycaster="objects: .grabbable, .clickable">
								</a-entity>
						</a-entity>

						<!-- VR users -->
						<a-entity
							id="leftHand"
							hand-controls="hand: left"
							super-hands="colliderEvent: raycaster-intersection"
							oculus-touch-controls="hand: left; model: false"
							vr-hand-grab="touchRadius: 0.24; palmY: -0.02; palmZ: -0.12"
							raycaster="objects: .grabbable, .clickable"
						></a-entity>
						<a-entity
							id="rightHand"
							hand-controls="hand: right"
							super-hands="colliderEvent: raycaster-intersection"
							oculus-touch-controls="hand: right; model: false"
							vr-hand-grab="touchRadius: 0.24; palmY: -0.02; palmZ: -0.12"
							raycaster="objects: .grabbable, .clickable"
						></a-entity>

				</a-entity>

				<a-entity primitive-grocery-store="width: ${store.width}; depth: ${store.depth};"></a-entity>

				<a-sky color="#87CEEB"></a-sky>
		</a-scene>
	`;

	// cleanup
	preloadAssets.remove();

	// NOTE: leave this at the end
	view.querySelector("a-scene").addEventListener("loaded", _ => {
		if (DEBUG_MODE) addCustomDevTools();
		AmbientAudio.start("#audio-ambience-sound");
	});
}

// helper functions
function _getModelFilesFromGroceriesFolder() {
	const context = require.context(
		"@/aframe/assets/models/items/groceries/",
		false,
		/\.(glb|gltf|obj)$/
	);

	return context.keys().map(path => ({
		filename: path.replace("./", ""),
		src: context(path)
	}));
}

function _getAudioFilesFromGroceriesFolder() {
	const context = require.context(
		"@/aframe/assets/audio/items/groceries/",
		false,
		/\.(mp3|wav|ogg)$/
	);

	return context.keys().map(path => ({
		filename: path.replace("./", ""),
		src: context(path)
	}));
}
