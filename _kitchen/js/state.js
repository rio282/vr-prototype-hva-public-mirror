// ===== GAME STATE =====
// Global state used by all runtime scripts.
let stoveOn = false;

let actions = {
  tomatoes: 0,
  tomatoesCut: 0,
  tomatoesInPan: 0,
  waterCups: 0,
  saltShakes: 0,
  stirs: 0,
  bacon: 0,
  egg: false,
  eggBroken: false,
  eggPlacedOnTable: false
};

let heldObject = null;
const arrowKeysDown = { left: false, right: false };

let stepTimerRunning = false;

const startPositions = {};

let cookingEffectsVolume = 0.5;
let backgroundMusicVolume = 0.2;
let voiceGuideVolume = 0.8;
const DEFAULT_HINT_TEXT = "Tip: Raak een receptkaart aan om te starten. Houd trigger of grip ingedrukt om iets vast te pakken.";

let activeVoiceAudio = null;
let voiceSequenceToken = 0;

const voiceAudioIds = [
  "voicePopup", "voiceTipStart",
  "voiceTomatensoep", "voiceEiMetBacon",
  "voiceTomatenSnijden", "voiceTomatenStukjes", "voiceKopjesWater",
  "voiceFornuisAan", "voiceWaterKoken", "voiceZoutStrooien",
  "voiceRoeren", "voiceLaatKoken", "voiceBaconInPan",
  "voiceBaconBakken", "voiceEiBreken",
  "voiceEenSter", "voiceTweeSterren", "voiceDrieSterren"
];

const uiState = {
  menuOpen: true,
  activePanel: "main",
  recipeStartTime: 0,
  hintTimeout: null,
  lastRoerHintStep: -1,
  lastStepVoiceKey: "",
  menuClickLockUntil: 0,
  uiReady: false
};

const recipes = {
  1: {
    name: "Tomatensoep",
    steps: [
      { text: "Pak 3 tomaten", check: () => actions.tomatoes >= 3 },
      { text: "Snijd de tomaten met een mes(3x3)", check: () => actions.tomatoesCut >= 9 },
      { text: "Leg de tomaten stukjes in de pan", check: () => actions.tomatoesInPan >= 9 },
      { text: "Voeg 2 kopjes water toe", check: () => actions.waterCups >= 2 },
      { text: "Zet het fornuis aan", check: () => stoveOn },
      { text: "Laat water koken", timer: 5 },
      { text: "Voeg zout toe (strooien)", check: () => actions.saltShakes >= 2 },
      { text: "Roer alles goed door met een lepel", check: () => actions.stirs >= 5 },
      { text: "Laat alles koken", timer: 15 }
    ]
  },
  2: {
    name: "Ei met bacon",
    steps: [
      { text: "Pak 1 ei", check: () => actions.egg },
      { text: "Leg het ei naast de pan", check: () => actions.eggPlacedOnTable },
      { text: "Leg 2 stukjes bacon in de pan", check: () => actions.bacon >= 2 },
      { text: "Zet het fornuis aan", check: () => stoveOn },
      { text: "Leg bacon in de pan", check: () => actions.bacon >= 2 },
      { text: "Laat bacon bakken", timer: 10 },
      { text: "Breek het ei in de pan", check: () => actions.eggBroken },
      { text: "Voeg zout toe (strooien)", check: () => actions.saltShakes >= 2 },
      { text: "Laat alles bakken", timer: 5 }
    ]
  }
};

let game = { recipe: null, step: 0, steps: [] };
