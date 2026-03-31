export const DEBUG_MODE = false;
export const keymap = {
	help: "h",
	toggleStats: "p",
	toggleNavMeshOverlay: "n",
};

// yeah... don't ask me
window.addEventListener("enter-vr", e => (USER_IS_USING_VR = AFRAME.utils.device.checkHeadsetConnected()));
window.addEventListener("exit-vr", e => (USER_IS_USING_VR = AFRAME.utils.device.checkHeadsetConnected()));
export let USER_IS_USING_VR;

export const ROOM_DIMENSIONS = Object.freeze({
	min: {
		width: 16,
		depth: 16,
	},
	max: {
		width: 32,
		depth: 32,
	},
});
