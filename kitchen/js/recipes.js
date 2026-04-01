// Recipe flow and progression logic.
// This file owns recipe state transitions, step text updates, and progress logic.

// ===== RECIPE STATE HELPERS =====

function correctRecipe(id) {

  return game.recipe && game.recipe === recipes[id];

}

function startRecipe(id) {

  // Always reset world state before starting a new recipe.
  resetKitchen();
  hideKitchenHint();

  uiState.lastRoerHintStep = -1;
  uiState.lastStepVoiceKey = "";

  console.log("START RECEPT:", id);
  playRecipeSelectionAudio(id);

  game.recipe = recipes[id];
  game.steps = recipes[id].steps;
  game.step = 0;
  uiState.recipeStartTime = Date.now();

  updateStep();

}


// ===== STEP UPDATE =====

function updateStep() {

  const step = game.steps[game.step];
  let text = step.text;

  if (step.text.includes("kopjes water")) {
    text = `Voeg 2 kopjes water toe (${actions.waterCups}/2)`;
  }

  if (step.text.includes("Snijd tomaten")) {
    text = `Snijd tomaten (${actions.tomatoesCut}/9)`;
  }

  if (step.text.includes("Pak 3 tomaten")) {
    text = `Pak 3 tomaten (${actions.tomatoes}/3)`;
  }

  if (step.text.includes("Snijd de tomaten met een mes")) {
    text = `Snijd de tomaten met een mes (${actions.tomatoesCut}/9)`;
  }

  if (step.text.includes("stukjes in pan")) {
    text = `Tomaten in pan (${actions.tomatoesInPan}/9)`;
  }

  if (step.text.includes("Leg de tomaten stukjes in de pan")) {
    text = `Leg de tomaten stukjes in de pan (${actions.tomatoesInPan}/9)`;
  }

  if (step.text.includes("zout")) {
    text = `Zout toevoegen (${actions.saltShakes}/2)`;
  }

  if (step.text.includes("Roer")) {

    text = `Roeren (${actions.stirs}/5)`;

    if (uiState.lastRoerHintStep !== game.step) {
      showStepHint("Oh nee! De lepel is van tafel gevallen, pak hem op om te roeren.", { showImages: false });
      playVoiceSequence(["voiceRoeren"]);
      uiState.lastRoerHintStep = game.step;
    }

  }

  playStepVoiceForCurrentStep(step);

  document.querySelector("#recipeStep").setAttribute("value", text);

  updateProgress();

  console.log("STEP:", text);

  if (step.timer && !stepTimerRunning) {

    stepTimerRunning = true;

    setTimeout(() => {
      stepTimerRunning = false;
      nextStep();
    }, step.timer * 1000);

  }

}


// ===== PROGRESS BAR UPDATE =====

function updateProgress() {

  const bar = document.querySelector("#progressBar");
  const percentText = document.querySelector("#progressPercent");

  let progress = game.step / game.steps.length;

  const step = game.steps[game.step];

  if (step) {

    if (step.text.includes("water")) {
      progress = (game.step + (actions.waterCups / 2)) / game.steps.length;
    }

    if (step.text.includes("Snijd")) {
      progress = (game.step + (actions.tomatoesCut / 9)) / game.steps.length;
    }

    if (step.text.includes("pan")) {
      progress = (game.step + (actions.tomatoesInPan / 9)) / game.steps.length;
    }

    if (step.text.includes("zout")) {
      progress = (game.step + (actions.saltShakes / 2)) / game.steps.length;
    }

    if (step.text.includes("Roer")) {
      progress = (game.step + (actions.stirs / 5)) / game.steps.length;
    }

  }

  progress = Math.min(progress, 1);

  bar.setAttribute("width", progress * 2);

  let percent = Math.floor(progress * 100);

  percentText.setAttribute("value", percent + "%");

}

function checkStep() {

  if (!game.recipe) return;
  if (game.step >= game.steps.length) return;

  const step = game.steps[game.step];

  if (step.check && step.check()) {
    console.log("Stap voltooid:", step.text);
    nextStep();
  }

}

function nextStep() {

  stepTimerRunning = false;

  game.step++;

  if (game.step >= game.steps.length) {

    console.log("RECEPT KLAAR!");

    const elapsedSeconds = uiState.recipeStartTime
      ? (Date.now() - uiState.recipeStartTime) / 1000
      : 0;

    document.querySelector("#recipeStep").setAttribute("value", "Gefeliciteerd! Recept klaar!");

    updateProgress();

    openCompletionScreen(elapsedSeconds);

    game.recipe = null;
    return;

  }

  updateStep();

}


// ===== RECIPE SYSTEM COMPONENT =====

AFRAME.registerComponent("recipe-system", {

  tick: function () {

    if (game.recipe) checkStep();

  }

});



// ===== RECIPE SELECT COMPONENT =====

AFRAME.registerComponent("recipe-select", {

  schema: {
    recipe: { type: "int" }
  },

  init: function () {

    this.touchRadius = 0.01;
    this.wasTouching = false;

    this.activate = () => {

      if (uiState.menuOpen) return;

      this.el.setAttribute("animation", "property:scale;to:1.2 1.2 1.2;dur:200;dir:alternate");

      startRecipe(this.data.recipe);

    };

    this.el.addEventListener("click", this.activate);

  },

  isHandTouching: function () {

    if (!isVrActive()) return false;
    if (uiState.menuOpen) return false;

    const box = new THREE.Box3().setFromObject(this.el.object3D);
    if (!isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z)) return false;

    const handIds = ["leftHand", "rightHand"];
    for (let i = 0; i < handIds.length; i++) {

      const hand = document.getElementById(handIds[i]);
      if (!hand || !hand.object3D) continue;

      const handPos = new THREE.Vector3();
      hand.object3D.getWorldPosition(handPos);

      const clamped = box.clampPoint(handPos, new THREE.Vector3());
      if (handPos.distanceTo(clamped) <= this.touchRadius) return true;

    }

    return false;

  },

  tick: function () {

    const touching = this.isHandTouching();
    if (touching && !this.wasTouching) {
      this.activate();
    }
    this.wasTouching = touching;

  },

  remove: function () {

    this.el.removeEventListener("click", this.activate);

  }

});
