// Kitchen reset and object respawn utilities.
// This file centralizes full-scene cleanup and deterministic object respawning.

// ===== KITCHEN RESET FUNCTION =====

function resetKitchen() {

  heldObject = null;
  selectedObject = null;

  const sceneEl = document.querySelector("a-scene");

  // Restore grabbables from hands back to scene
  ["#camera", "#leftHand", "#rightHand"].forEach(parentId => {

    const parent = document.querySelector(parentId);
    if (!parent) return;

    parent.object3D.children.slice().forEach(child => {
      if (child.el && child.el.classList && child.el.classList.contains("grabbable")) {
        sceneEl.object3D.add(child);
        if (child.el.dataset) delete child.el.dataset.vrHeldBy;
      }
    });

  });

  // Reset action counters
  actions = {
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

  arrowKeysDown.left = false;
  arrowKeysDown.right = false;
  uiState.lastRoerHintStep = -1;
  uiState.lastStepVoiceKey = "";
  stopVoicePlayback();

  // Remove water droplets
  document.querySelectorAll("[water-drop]").forEach(el => el.remove());

  // Remove salt grains
  document.querySelectorAll("[salt-grain]").forEach(el => el.remove());

  // Remove bubbles
  document.querySelectorAll("[bubble]").forEach(el => el.remove());

  // Remove steam particles
  document.querySelectorAll("[steam]").forEach(el => el.remove());

  // Reset stove and fire
  stoveOn = false;
  document.querySelector("#fire").setAttribute("visible", false);

  // Reset UI
  document.querySelector("#progressBar").setAttribute("width", "0.01");
  document.querySelector("#progressPercent").setAttribute("value", "0%");
  document.querySelector("#soup").setAttribute("color", "#220000");

  // Remove whole tomatoes
  document.querySelectorAll("[tomato]").forEach(el => el.remove());

  // Reset stove knob
  const knob = document.querySelector("#stoveKnob");
  knob.setAttribute("rotation", "0 0 0");
  knob.removeAttribute("dynamic-body");

  // Restore knob to stove
  const stove = document.querySelector("#stove");
  if (stove && knob.object3D.parent !== stove.object3D) {
    stove.object3D.add(knob.object3D);
    knob.object3D.position.set(0.4, 0.15, 0.4);
  }

  // Disable cooking audio
  setCookingAudio(false);

  // Remove tomato pieces
  document.querySelectorAll("[tomato-piece]").forEach(el => el.remove());

  // Remove yolk objects
  const yolk = document.querySelector("#yolk");
  if (yolk) yolk.remove();
  document.querySelectorAll("[egg-yolk]").forEach(el => el.remove());

  // Remove egg shells
  document.querySelectorAll("[egg-shell]").forEach(el => el.remove());

  // Remove all loose kitchen tools and ingredients
  ["#bacon1", "#bacon2", "#egg", "#saltShaker", "#spoon", "#cup", "#knife"].forEach(id => {
    const el = document.querySelector(id);
    if (el) el.remove();
  });

  // Respawn all objects
  spawnTomatoes();
  spawnBacon();
  spawnEgg();
  spawnSalt();
  spawnSpoon();
  spawnCup();
  spawnKnife();

}



// ===== SPAWN TOMATOES =====

function spawnTomatoes() {

  // Remove existing tomatoes first
  document.querySelectorAll("[tomato]").forEach(t => t.remove());

  const positions = [
    { x: -3.30, y: 1.2, z: -4.5 },
    { x: -3, y: 1.2, z: -4.5 },
    { x: -2.70, y: 1.2, z: -4.5 }
  ];

  positions.forEach(p => {

    const tomato = document.createElement("a-sphere");

    tomato.setAttribute("radius", "0.15");
    tomato.setAttribute("color", "red");
    tomato.setAttribute("position", `${p.x} ${p.y} ${p.z}`);

    tomato.setAttribute("tomato", "");
    tomato.setAttribute("mouse-drag", "");
    tomato.setAttribute("dynamic-body", "mass:0.3");

    tomato.classList.add("grabbable", "clickable");

    addTomatoStem(tomato);

    document.querySelector("a-scene").appendChild(tomato);

  });

  // Reset all grabbable objects to their start transform
  document.querySelectorAll(".grabbable").forEach(el => {

    if (el.id === "stoveKnob") {
      el.removeAttribute("dynamic-body");
      el.setAttribute("rotation", "0 0 0");
      return;
    }

    if (!el.getAttribute("position")) return;

    const start = startPositions[el.id];

    if (start) {
      el.setAttribute("position", start.pos);
      if (start.rot) el.setAttribute("rotation", start.rot);
    }

    // Force physics body reset
    el.removeAttribute("dynamic-body");
    setTimeout(() => {
      el.setAttribute("dynamic-body", "mass:1");
    }, 50);

  });

}


// ===== SPAWN BACON =====

function spawnBacon() {

  const positions = [
    { x: 3, y: 1, z: -4.5 },
    { x: 3.2, y: 1, z: -4.5 }
  ];

  positions.forEach((p, i) => {

    const bacon = document.createElement("a-box");

    bacon.setAttribute("id", "bacon" + (i + 1));
    bacon.setAttribute("width", "0.24");
    bacon.setAttribute("height", "0.03");
    bacon.setAttribute("depth", "0.2");
    bacon.setAttribute("color", "#b22222");
    bacon.setAttribute("position", `${p.x} ${p.y} ${p.z}`);

    bacon.setAttribute("bacon", "");
    bacon.setAttribute("mouse-drag", "");
    bacon.setAttribute("dynamic-body", "mass:1; linearDamping:0.9; angularDamping:1");

    bacon.classList.add("grabbable", "clickable");

    addBaconStripes(bacon);

    document.querySelector("a-scene").appendChild(bacon);

  });

}


// ===== SPAWN EGG =====

function spawnEgg() {

  const egg = document.createElement("a-sphere");

  egg.setAttribute("id", "egg");
  egg.setAttribute("radius", "0.14");
  egg.setAttribute("scale", "0.9 1.2 0.9");
  egg.setAttribute("color", "#fff8dc");
  egg.setAttribute("position", "3 1 -4.8");

  egg.setAttribute("egg", "");
  egg.setAttribute("egg-break", "");
  egg.setAttribute("mouse-drag", "");
  egg.setAttribute("dynamic-body", "mass:1; linearDamping:0.9; angularDamping:1");

  egg.classList.add("grabbable", "clickable");

  document.querySelector("a-scene").appendChild(egg);

}


// ===== SPAWN SPOON =====

function spawnSpoon() {

  const spoon = document.createElement("a-cylinder");

  spoon.setAttribute("id", "spoon");
  spoon.setAttribute("radius", "0.018");
  spoon.setAttribute("height", "0.3");
  spoon.setAttribute("color", "#964B00");
  spoon.setAttribute("position", "0.5 0.12 -3.8");
  spoon.setAttribute("rotation", "90 0 0");

  spoon.setAttribute("spoon", "");
  spoon.setAttribute("mouse-drag", "");
  spoon.setAttribute("dynamic-body", "mass:1; linearDamping:0.9; angularDamping:1");

  spoon.classList.add("grabbable", "clickable");

  addSpoonBowl(spoon);

  document.querySelector("a-scene").appendChild(spoon);

}


// ===== SPAWN SALT SHAKER =====

function spawnSalt() {

  const salt = document.createElement("a-cylinder");

  salt.setAttribute("id", "saltShaker");
  salt.setAttribute("radius", "0.08");
  salt.setAttribute("height", "0.25");
  salt.setAttribute("color", "#fff");
  salt.setAttribute("position", "1 1.15 -3.5");

  salt.setAttribute("salt", "");
  salt.setAttribute("mouse-drag", "");
  salt.setAttribute("dynamic-body", "mass:1; linearDamping:0.9; angularDamping:1");

  salt.classList.add("grabbable", "clickable");

  addSaltCap(salt);

  document.querySelector("a-scene").appendChild(salt);

}


// ===== SPAWN CUP =====

function spawnCup() {

  const cup = document.createElement("a-cylinder");

  cup.setAttribute("id", "cup");
  cup.setAttribute("radius", "0.09");
  cup.setAttribute("height", "0.18");
  cup.setAttribute("color", "#eaf0f6");
  cup.setAttribute("opacity", "0.18");
  cup.setAttribute("position", "0 1.15 -3.5");

  cup.setAttribute("cup", "");
  cup.setAttribute("mouse-drag", "");
  cup.setAttribute("dynamic-body", "mass:1; linearDamping:0.9; angularDamping:1");

  cup.classList.add("grabbable", "clickable");

  addCupGlassShell(cup);

  document.querySelector("a-scene").appendChild(cup);

}


// ===== SPAWN KNIFE =====

function spawnKnife() {

  const knife = document.createElement("a-box");

  knife.setAttribute("id", "knife");
  knife.setAttribute("width", "0.05");
  knife.setAttribute("height", "0.05");
  knife.setAttribute("depth", "0.24");
  knife.setAttribute("color", "#2f2f2f");
  knife.setAttribute("position", "-1 1.1 -3");

  knife.setAttribute("knife", "");
  knife.setAttribute("mouse-drag", "");
  knife.setAttribute("dynamic-body", "mass:1; linearDamping:0.9; angularDamping:1");

  knife.classList.add("grabbable", "clickable");

  addKnifeDetails(knife);

  document.querySelector("a-scene").appendChild(knife);

}

///////////////////////////// DEBUGGING POSITIES EN OBJECTEN  /////////////////////////////
// setInterval(() => {

//   const rig = document.querySelector("#rig");
//   if (!rig) return;
//   console.log("RIG positie:", rig.object3D.position);

// }, 2000);

// setInterval(() => {

//   const knife = document.querySelector("#knife");

//   if (!knife || !knife.body) {
//     console.log(" MES GEEN BODY");
//     return;
//   }

//   console.log("MES Y:", knife.body.position.y);

// }, 2000);

// console.log("StartPositions:", startPositions);

// document.querySelectorAll(".grabbable").forEach(el=>{
// if(!el.id){
// console.warn("GEEN ID:", el);
// }
// });