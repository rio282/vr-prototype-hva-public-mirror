// ===== UI / AUDIO / MENU =====
// This file manages menu panels, UI hints, volume controls, and guided voice playback.

// ===== VOICE PLAYBACK HELPERS =====
function lockMenuClicks(ms) {
	uiState.menuClickLockUntil = performance.now() + Math.max(0, ms || 0);
}

function isMenuClickLocked() {
	return performance.now() < uiState.menuClickLockUntil;
}

function setVoiceAudioVolumes() {
	voiceAudioIds.forEach((id) => {
		const el = document.querySelector(`#${id}`);
		if (el) el.volume = voiceGuideVolume;
	});
}

function stopVoicePlayback() {
	if (activeVoiceAudio) {
		activeVoiceAudio.pause();
		activeVoiceAudio.currentTime = 0;
	}
	activeVoiceAudio = null;
}

function waitForAudioFinish(audio, token) {
	return new Promise((resolve) => {
		if (!audio || voiceSequenceToken !== token) {
			resolve();
			return;
		}

		let done = false;
		let fallback = null;

		const finish = () => {
			if (done) return;
			done = true;

			audio.removeEventListener("ended", finish);
			audio.removeEventListener("error", finish);
			clearTimeout(fallback);

			resolve();
		};

		audio.addEventListener("ended", finish);
		audio.addEventListener("error", finish);

		const fallbackMs = (isFinite(audio.duration) && audio.duration > 0)
			? Math.ceil(audio.duration * 1000) + 300
			: 6000;

		fallback = setTimeout(finish, fallbackMs);
	});
}

async function playVoiceSequence(audioIds) {
	const list = Array.isArray(audioIds) ? audioIds : [audioIds];
	const token = ++voiceSequenceToken;

	stopVoicePlayback();

	for (let i = 0; i < list.length; i++) {
		if (voiceSequenceToken !== token) return;

		const audio = document.querySelector(`#${list[i]}`);
		if (!audio) continue;

		audio.pause();
		audio.currentTime = 0;
		audio.volume = voiceGuideVolume;
		activeVoiceAudio = audio;

		const p = audio.play();
		if (p && p.catch) {
			try {
				await p;
			} catch (_e) {
				continue;
			}
		}

		await waitForAudioFinish(audio, token);
	}

	if (voiceSequenceToken === token) {
		activeVoiceAudio = null;
	}
}

function playRecipeSelectionAudio(recipeId) {
	if (recipeId === 1) {
		playVoiceSequence(["voiceTomatensoep"]);
		return;
	}

	if (recipeId === 2) {
		playVoiceSequence(["voiceEiMetBacon"]);
	}
}

function getStepVoiceAudioId(stepText) {
	const t = (stepText || "").toLowerCase();

	if (t.includes("snijd de tomaten")) return "voiceTomatenSnijden";
	if (t.includes("leg de tomaten stukjes in de pan")) return "voiceTomatenStukjes";
	if (t.includes("voeg 2 kopjes water toe")) return "voiceKopjesWater";
	if (t.includes("zet het fornuis aan")) return "voiceFornuisAan";
	if (t.includes("laat water koken")) return "voiceWaterKoken";
	if (t.includes("voeg zout toe")) return "voiceZoutStrooien";
	if (t.includes("laat alles koken") || t.includes("laat alles bakken")) return "voiceLaatKoken";
	if (t.includes("leg 2 stukjes bacon in de pan") || t.includes("leg bacon in de pan")) return "voiceBaconInPan";
	if (t.includes("laat bacon bakken")) return "voiceBaconBakken";
	if (t.includes("breek het ei in de pan")) return "voiceEiBreken";

	return "";
}

function playStepVoiceForCurrentStep(step) {
	if (!game.recipe || !step) return;

	const key = `${game.recipe.name}|${game.step}|${step.text}`;
	if (uiState.lastStepVoiceKey === key) return;

	uiState.lastStepVoiceKey = key;

	const audioId = getStepVoiceAudioId(step.text);
	if (audioId) {
		playVoiceSequence([audioId]);
	}
}

function playStarVoice(stars) {
	if (stars >= 3) {
		playVoiceSequence(["voiceDrieSterren"]);
		return;
	}

	if (stars === 2) {
		playVoiceSequence(["voiceTweeSterren"]);
		return;
	}

	playVoiceSequence(["voiceEenSter"]);
}

// ===== MENU HELPERS =====
const menuClickableIds = [
	"#btnPlay", "#btnSettings",
	"#btnKitchen",
	"#btnBackToMain", "#btnSettingsBack",
	"#btnBgMinus", "#btnBgPlus",
	"#btnCookMinus", "#btnCookPlus",
	"#btnVoiceMinus", "#btnVoicePlus",
	"#btnRestart", "#btnMainMenu"
];

function setCanvasMenuBlur(_enabled) {
	const canvas = document.querySelector("canvas.a-canvas");
	if (!canvas) return;

	canvas.style.filter = "none";
}

function teleportToSpawn() {
	const rig = document.querySelector("#rig");
	if (!rig) return;

	const p = rig.getAttribute("position") || { x: 0, y: 0, z: 5 };
	rig.setAttribute("position", `${0} ${p.y} ${7}`);
	rig.setAttribute("rotation", "0 0 0");
}

function setHintImagesVisible(visible) {
	setVisible("#hintJoystickImage", visible);
	setVisible("#hintReceptenImage", visible);
}

function setHintLayout(showImages) {
	const panel = document.querySelector("#hintPanel");
	const panelBg = document.querySelector("#hintPanel a-plane");
	const hintText = document.querySelector("#hintText");
	if (!panel || !panelBg || !hintText) return;

	if (showImages) {
		panel.setAttribute("position", "0 -0.03 -0.15");
		panelBg.setAttribute("width", "2.35");
		panelBg.setAttribute("height", "1.15");
		hintText.setAttribute("width", "2.12");
		hintText.setAttribute("position", "0 -0.35 0.03");
		return;
	}

	panel.setAttribute("position", "0 -0.2 -0.15");
	panelBg.setAttribute("width", "1.4");
	panelBg.setAttribute("height", "0.28");
	hintText.setAttribute("width", "1.28");
	hintText.setAttribute("position", "0 0 0.03");
}

function setMenuClickable(enabled) {
	menuClickableIds.forEach((id) => {
		const el = document.querySelector(id);
		if (!el) return;

		if (enabled) {
			el.classList.add("clickable");
		} else {
			el.classList.remove("clickable");
		}
	});
}

function setVisible(id, visible) {
	const el = document.querySelector(id);
	if (el) {
		el.setAttribute("visible", visible);
	}
}

function setMenuControllerPointers(enabled) {
	const hands = ["#leftHand", "#rightHand"];

	hands.forEach((id) => {
		const hand = document.querySelector(id);
		if (!hand) return;

		if (enabled) {
			hand.setAttribute("raycaster", "objects: .clickable; far: 4.5; showLine: true; enabled: true");
			hand.setAttribute("line", "color: #9ee7ff; opacity: 0.95");
		} else {
			hand.setAttribute("raycaster", "objects: .clickable; far: 2.5; showLine: false; enabled: false");
			hand.removeAttribute("line");
		}
	});
}

function syncMenuInputMode() {
	const usePointers = uiState.menuOpen;
	setMenuControllerPointers(usePointers);
}

function showPanel(name) {
	uiState.activePanel = name;

	setVisible("#mainMenuPanel", name === "main");
	setVisible("#settingsPanel", name === "settings");
	setVisible("#tipsPanel", name === "tips");
	setVisible("#completionPanel", name === "complete");

	setCanvasMenuBlur(uiState.menuOpen);
	syncMenuInputMode();
}

function setMenuOpen(open) {
	uiState.menuOpen = open;

	setVisible("#uiAnchor", true);
	setCanvasMenuBlur(open);
	setVisible("#menuBackdrop", open);
	setMenuClickable(open);
	syncMenuInputMode();

	const rig = document.querySelector("#rig");
	if (rig) {
		rig.setAttribute("movement-controls", `speed:0.1; constrainToNavMesh:true; enabled:${open ? "false" : "true"}`);
	}

	if (!open) {
		setVisible("#mainMenuPanel", false);
		setVisible("#settingsPanel", false);
		setVisible("#completionPanel", false);
	}
}

// ===== FEEDBACK / TIMER =====
function formatTime(seconds) {
	const s = Math.max(0, Math.floor(seconds));
	const m = Math.floor(s / 60);
	const rem = s % 60;

	const mm = String(m).padStart(2, "0");
	const ss = String(rem).padStart(2, "0");

	return `${mm}:${ss}`;
}

function starCountForTime(seconds) {
	if (seconds <= 120) return 3;
	if (seconds <= 180) return 2;
	return 1;
}

function setStarDisplay(stars) {
	const ids = ["#star1", "#star2", "#star3"];

	ids.forEach((id, idx) => {
		const el = document.querySelector(id);
		if (!el) return;

		el.setAttribute("src", idx < stars ? "#yellowStarImage" : "#blackStarImage");
	});
}

function getTargetInfo(seconds, stars) {
	if (stars === 3) {
		return "Topscore behaald: 3 sterren!";
	}

	const toClock = (v) => formatTime(v);

	if (stars === 2) {
		return `Voor 3 sterren: klaar zijn binnen ${toClock(120)}.`;
	}

	if (seconds <= 180) {
		return `Voor 2 sterren: binnen ${toClock(180)}. Voor 3 sterren: binnen ${toClock(120)}.`;
	}

	return `Volgende doelen: 2 sterren binnen ${toClock(180)}, 3 sterren binnen ${toClock(120)}.`;
}

function getFeedback(stars) {
	if (stars === 3) return "Geweldig gedaan. Je werkte super geconcentreerd en snel!";
	if (stars === 2) return "Goed bezig. Je gaat al heel netjes vooruit.";
	return "Netjes gedaan. Blijf oefenen en vraag hulp als iets onduidelijk is.";
}

function playCompleteSound() {
	const complete = document.querySelector("#completeSound");
	if (!complete) return;

	complete.currentTime = 0;
	const p = complete.play();
	if (p && p.catch) {
		p.catch(() => { });
	}
}

function ensureBackgroundMusic() {
	const bg = document.querySelector("#backgroundSound");
	if (!bg) return;

	bg.loop = true;
	bg.volume = backgroundMusicVolume;

	if (bg.paused) {
		const p = bg.play();
		if (p && p.catch) {
			p.catch(() => { });
		}
	}
}

function updateVolumeLabels() {
	const bgLabel = document.querySelector("#bgVolumeValue");
	if (bgLabel) {
		bgLabel.setAttribute("value", `${Math.round(backgroundMusicVolume * 100)}%`);
	}

	const cookLabel = document.querySelector("#cookVolumeValue");
	if (cookLabel) {
		cookLabel.setAttribute("value", `${Math.round(cookingEffectsVolume * 100)}%`);
	}

	const voiceLabel = document.querySelector("#voiceVolumeValue");
	if (voiceLabel) {
		voiceLabel.setAttribute("value", `${Math.round(voiceGuideVolume * 100)}%`);
	}

	const bg = document.querySelector("#backgroundSound");
	if (bg) {
		bg.volume = backgroundMusicVolume;
	}

	const pan = document.querySelector("#pan");
	if (pan) {
		pan.setAttribute("sound", "volume", cookingEffectsVolume);
	}

	setVoiceAudioVolumes();
}

// ===== HINTS =====
function showKitchenHint() {
	const hintText = document.querySelector("#hintText");
	if (hintText) {
		hintText.setAttribute("value", DEFAULT_HINT_TEXT);
	}

	setHintLayout(true);
	setHintImagesVisible(true);
	setVisible("#hintPanel", true);
	playVoiceSequence(["voicePopup", "voiceTipStart"]);

	if (uiState.hintTimeout) {
		clearTimeout(uiState.hintTimeout);
	}

	uiState.hintTimeout = setTimeout(() => {
		setVisible("#hintPanel", false);
		uiState.hintTimeout = null;
	}, 15000);
}

function showStepHint(message, options = {}) {
	const showImages = options.showImages !== false;

	const hintText = document.querySelector("#hintText");
	if (hintText) {
		hintText.setAttribute("value", message);
	}

	setHintLayout(showImages);
	setHintImagesVisible(showImages);
	setVisible("#hintPanel", true);

	if (uiState.hintTimeout) {
		clearTimeout(uiState.hintTimeout);
	}

	uiState.hintTimeout = setTimeout(() => {
		setVisible("#hintPanel", false);

		const text = document.querySelector("#hintText");
		if (text) {
			text.setAttribute("value", DEFAULT_HINT_TEXT);
		}

		uiState.hintTimeout = null;
	}, 15000);
}

function hideKitchenHint() {
	setVisible("#hintPanel", false);
	setHintLayout(true);
	setHintImagesVisible(true);

	if (uiState.hintTimeout) {
		clearTimeout(uiState.hintTimeout);
		uiState.hintTimeout = null;
	}
}

// ===== COMPLETION =====
function openCompletionScreen(seconds) {
	const stars = starCountForTime(seconds);
	setStarDisplay(stars);

	const t = document.querySelector("#completeTime");
	if (t) {
		t.setAttribute("value", `Tijd: ${formatTime(seconds)}`);
	}

	const feedback = document.querySelector("#completionFeedback");
	if (feedback) {
		feedback.setAttribute("value", getFeedback(stars));
	}

	const targetInfo = document.querySelector("#starTargetInfo");
	if (targetInfo) {
		targetInfo.setAttribute("value", getTargetInfo(seconds, stars));
	}

	teleportToSpawn();
	showPanel("complete");
	setMenuOpen(true);

	playCompleteSound();
	playStarVoice(stars);
}

function bindHintDismissEvents() {
	const hands = ["#leftHand", "#rightHand"];
	const dismissEvents = ["pinchstarted"];

	hands.forEach((id) => {
		const hand = document.querySelector(id);
		if (!hand) return;

		dismissEvents.forEach((evt) => {
			hand.addEventListener(evt, hideKitchenHint);
		});
	});
}

// ===== MENU BOOTSTRAP =====
function setupMenuUi() {
	// Wire all clickable menu controls to their behavior.
	if (uiState.uiReady) return;
	uiState.uiReady = true;

	const scene = document.querySelector("a-scene");
	if (scene) {
		scene.addEventListener("click", ensureBackgroundMusic);
	}

	const onClick = (ids, fn) => {
		const list = Array.isArray(ids) ? ids : [ids];

		list.forEach((id) => {
			const el = document.querySelector(id);
			if (el) {
				el.addEventListener("click", fn);
			}
		});
	};

	onClick("#btnPlay", () => {
		if (!uiState.menuOpen) return;
		if (isMenuClickLocked()) return;

		setMenuOpen(false);
		hideKitchenHint();
		showKitchenHint();
	});

	onClick("#btnSettings", () => {
		if (!uiState.menuOpen) return;
		if (isMenuClickLocked()) return;

		ensureBackgroundMusic();
		showPanel("settings");
		lockMenuClicks(180);
	});

	onClick("#btnTips", () => {
		if (!uiState.menuOpen) return;
		showPanel("tips");
	});

	onClick("#btnBackToMain", () => {
		if (!uiState.menuOpen) return;
		if (isMenuClickLocked()) return;

		showPanel("main");
		lockMenuClicks(180);
	});

	onClick("#btnSettingsBack", () => {
		if (!uiState.menuOpen) return;
		if (isMenuClickLocked()) return;

		showPanel("main");
		lockMenuClicks(180);
	});

	onClick("#btnTipsBack", () => {
		if (!uiState.menuOpen) return;
		showPanel("main");
	});

	onClick("#btnRestart", () => {
		if (!uiState.menuOpen) return;

		setMenuOpen(false);
		hideKitchenHint();
		showKitchenHint();
		resetKitchen();

		document.querySelector("#recipeStep").setAttribute("value", "Raak een receptkaart aan om te starten");
	});

	onClick("#btnMainMenu", () => {
		// if (!uiState.menuOpen) return;
		//
		// resetKitchen();
		// showPanel("main");
		// setMenuOpen(true);
		// hideKitchenHint();

		window.location.href = "/";
	});

	const clamp01 = (v) => Math.min(1, Math.max(0, v));

	onClick("#btnBgMinus", () => {
		if (!uiState.menuOpen) return;
		backgroundMusicVolume = clamp01(backgroundMusicVolume - 0.1);
		updateVolumeLabels();
	});

	onClick("#btnBgPlus", () => {
		if (!uiState.menuOpen) return;
		backgroundMusicVolume = clamp01(backgroundMusicVolume + 0.1);
		updateVolumeLabels();
	});

	onClick("#btnCookMinus", () => {
		if (!uiState.menuOpen) return;
		cookingEffectsVolume = clamp01(cookingEffectsVolume - 0.1);
		updateVolumeLabels();
	});

	onClick("#btnCookPlus", () => {
		if (!uiState.menuOpen) return;
		cookingEffectsVolume = clamp01(cookingEffectsVolume + 0.1);
		updateVolumeLabels();
	});

	onClick("#btnVoiceMinus", () => {
		if (!uiState.menuOpen) return;
		voiceGuideVolume = clamp01(voiceGuideVolume - 0.1);
		updateVolumeLabels();
	});

	onClick("#btnVoicePlus", () => {
		if (!uiState.menuOpen) return;
		voiceGuideVolume = clamp01(voiceGuideVolume + 0.1);
		updateVolumeLabels();
	});

	bindHintDismissEvents();

	showPanel("main");
	setMenuOpen(true);
	updateVolumeLabels();

	document.querySelector("#recipeStep").setAttribute("value", "Raak een receptkaart aan om te starten");
}

window.addEventListener("load", () => {
	setTimeout(setupMenuUi, 100);
});

function isVrActive() {
	const scene = document.querySelector("a-scene");
	if (!scene) return false;

	return scene.is("vr-mode") || (scene.renderer && scene.renderer.xr && scene.renderer.xr.isPresenting);
}

