import {StoreLayoutGenerator, DEFAULT_RACK_PROPS} from "@/aframe/core/generators/grocery-store-layout-generator";

AFRAME.registerComponent("primitive-grocery-store", {
	// TODO: move?
	wallProps: {
		height: 10,
		thickness: 0.05,
	},
	floorProps: {
		thickness: 5.05,  // thick to prevent some clipping
	},

	schema: {
		width: {type: "number", default: 24},
		depth: {type: "number", default: 16},
		floorMaterial: {type: "string", default: "teal"},
		wallMaterial: {type: "string", default: "gray"},
	},

	// -- initialization -----------------------------------------------------------------------------------------------
	init: function () {
		this.currentPhase = 0;
		this.phases = Object.freeze([
			this.phase0_generateEnvironment.bind(this),
			this.phase1_generateStoreLayout.bind(this),
			this.phase2_generatePaymentTillAndExit.bind(this),
			this.phase3_generateNavigationMesh.bind(this)
		]);
	},

	tick: function () {
		// if we already completed the phases, return
		if (this.currentPhase >= this.phases.length) return;

		// collect
		const nextPhase = this.phases[this.currentPhase];
		console.debug(`Phase ${this.currentPhase + 1}/${this.phases.length}: ${nextPhase.name.split("generate").pop()}`);

		// advance
		nextPhase();
		this.currentPhase++;
	},

	phase0_generateEnvironment: function () {
		this.generateFloor();
		this.generateWalls();
		this.generateCeiling();
	},

	phase1_generateStoreLayout: function () {
		this.layoutGenerator = new StoreLayoutGenerator(this.el, this.data);
		this.layoutGenerator.generate();
	},

	phase2_generatePaymentTillAndExit: function () {
		// get random rack
		const racks = this.layoutGenerator.getRacks();
		const destinationRack = racks[Math.floor(Math.random() * racks.length)];

		// get required data
		const rackObj = destinationRack.object3D;
		const worldPos = new THREE.Vector3();
		rackObj.getWorldPosition(worldPos);
		const worldQuat = new THREE.Quaternion();
		rackObj.getWorldQuaternion(worldQuat);

		const euler = new THREE.Euler().setFromQuaternion(worldQuat, "YXZ");
		const ry = THREE.MathUtils.radToDeg(euler.y);

		const forward = new THREE.Vector3();
		rackObj.getWorldDirection(forward); // normalized
		const up = new THREE.Vector3(0, 1, 0);
		const right = new THREE.Vector3().crossVectors(forward, up).normalize();

		// remove rack & add player
		destinationRack.remove();

		const playerOffset = this.layoutGenerator.getRackProperties().depth + 3.5;
		const playerPos = worldPos.clone().add(forward.clone().multiplyScalar(playerOffset));

		const player = this.el.sceneEl.querySelector("#player");
		player.setAttribute("position", `${playerPos.x} ${playerPos.y} ${playerPos.z}`);
		player.setAttribute("rotation", `0 ${ry + 180} 0`);

		// teleport basket to player
		const groceryBasketForwardOffset = playerOffset + 2;
		const groceryBasketSideOffset = 1;
		const groceryBasketPos = worldPos.clone()
			.add(forward.clone().multiplyScalar(groceryBasketForwardOffset))
			.add(right.clone().multiplyScalar(groceryBasketSideOffset));

		const groceryBasket = document.createElement("a-entity");
		groceryBasket.setAttribute("gltf-model", "#basket");
		groceryBasket.setAttribute("collector-entity", "");
		groceryBasket.setAttribute("mouse-drag", "");
		groceryBasket.setAttribute("scale", "1.5 1.5 1.5");
		groceryBasket.setAttribute("position", `${groceryBasketPos.x} ${groceryBasketPos.y + 1} ${groceryBasketPos.z}`);
		groceryBasket.setAttribute("rotation", `0 ${ry + 135} 0`);
		groceryBasket.setAttribute("dynamic-body", "shape: box;");
		groceryBasket.classList.add("grabbable");

		const groceryBasketHandle = document.createElement("a-entity");
		groceryBasketHandle.setAttribute("id", "grab-point");
		groceryBasketHandle.setAttribute("position", "0 -1.3 0.33");

		groceryBasket.appendChild(groceryBasketHandle);
		this.el.sceneEl.appendChild(groceryBasket);

		// add door
		const doorOffset = -(this.layoutGenerator.getRackProperties().depth * 0.225);
		const doorPos = worldPos.clone().add(forward.clone().multiplyScalar(doorOffset));

		const door = document.createElement("a-entity");
		door.setAttribute("gltf-model", "#sliding-door");
		door.setAttribute("position", `${doorPos.x} ${doorPos.y} ${doorPos.z}`);
		door.setAttribute("rotation", `0 ${ry} 0`);

		this.el.sceneEl.appendChild(door);

		// add teleportation mat
		const completionMat = document.createElement("a-box");
		completionMat.setAttribute("primitive-completion-mat", "");
		completionMat.setAttribute("width", 3);
		completionMat.setAttribute("height", 0.1);
		completionMat.setAttribute("depth", 1.5);
		completionMat.setAttribute("position", `${doorPos.x} ${doorPos.y} ${doorPos.z}`);
		completionMat.setAttribute("rotation", `0 ${ry} 0`);

		this.el.sceneEl.appendChild(completionMat);

		// add exit sign
		const exitSign = document.createElement("a-entity");
		exitSign.setAttribute("gltf-model", "#exit-sign");
		exitSign.setAttribute("position", `${doorPos.x} ${doorPos.y + 2} ${doorPos.z}`);
		exitSign.setAttribute("rotation", `0 ${ry} 0`);

		this.el.sceneEl.appendChild(exitSign);

		// add payment till
		const tillForwardOffset = this.layoutGenerator.getRackProperties().depth + 2;
		const tillSideOffset = this.layoutGenerator.getRackProperties().width * 0.1;
		const tillPos = worldPos
			.clone()
			.add(forward.clone().multiplyScalar(tillForwardOffset))
			.add(right.clone().multiplyScalar(tillSideOffset));
		const tillScale = 1.5;

		const till = document.createElement("a-entity");
		till.setAttribute("gltf-model", "#payment-till");
		till.setAttribute("position", `${tillPos.x} ${tillPos.y + tillScale} ${tillPos.z}`);
		till.setAttribute("rotation", `0 ${ry} 0`);
		till.setAttribute("scale", `${tillScale} ${tillScale} ${tillScale}`);

		this.el.sceneEl.appendChild(till);
	},

	phase3_generateNavigationMesh: function () {
		this.generateNavigationMesh();
	},

	// -----------------------------------------------------------------------------------------------------------------
	/**
	 * Generates the floor using the provided floorMaterial.
	 * Supports image textures or color strings.
	 */
	generateFloor() {
		const floor = document.createElement("a-box");
		floor.setAttribute("width", this.data.width);
		floor.setAttribute("height", this.floorProps.thickness);
		floor.setAttribute("depth", this.data.depth);
		floor.setAttribute("position", `0 ${-this.floorProps.thickness / 2} 0`);
		floor.setAttribute("static-body", "");

		// if anything goes wrong here, it's not my fault. IDC!!!
		if (this.data.floorMaterial.startsWith("url(") || this.data.floorMaterial.startsWith("#"))
			floor.setAttribute("material", `src: ${this.data.floorMaterial}`);
		else floor.setAttribute("material", `color: ${this.data.floorMaterial}`);

		this.el.sceneEl.appendChild(floor);
	},

	/**
	 * Generates four walls with the provided wallMaterial.
	 * Supports image textures or color strings.
	 */
	generateWalls() {
		// just trust me bro...
		const positions = [
			{
				x: 0,
				y: this.wallProps.height / 2,
				z: -(this.data.depth / 2) + this.wallProps.thickness / 2,
				width: this.data.width,
				depth: this.wallProps.thickness
			},
			{
				x: 0,
				y: this.wallProps.height / 2,
				z: (this.data.depth / 2) - this.wallProps.thickness / 2,
				width: this.data.width,
				depth: this.wallProps.thickness
			},
			{
				x: -(this.data.width / 2) + this.wallProps.thickness / 2,
				y: this.wallProps.height / 2,
				z: 0,
				width: this.wallProps.thickness,
				depth: this.data.depth
			},
			{
				x: (this.data.width / 2) - this.wallProps.thickness / 2,
				y: this.wallProps.height / 2,
				z: 0,
				width: this.wallProps.thickness,
				depth: this.data.depth
			},
		];

		positions.forEach(pos => {
			const wall = document.createElement("a-box");
			wall.setAttribute("width", pos.width);
			wall.setAttribute("height", this.wallProps.height.toString());
			wall.setAttribute("depth", pos.depth);
			wall.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
			wall.setAttribute("static-body", "");

			// YES, again... if anything goes wrong here, it's not my fault. IDC!!!
			if (this.data.wallMaterial.startsWith("url(") || this.data.wallMaterial.startsWith("#"))
				wall.setAttribute("material", `src: ${this.data.wallMaterial}`);
			else wall.setAttribute("material", `color: ${this.data.wallMaterial}`);

			this.el.sceneEl.appendChild(wall);
		});
	},

	/**
	 * Generates the ceiling using the provided wallMaterial.
	 * Supports image textures or color strings.
	 */
	generateCeiling() {
		const ceiling = document.createElement("a-box");
		ceiling.setAttribute("width", this.data.width);
		ceiling.setAttribute("height", this.floorProps.thickness);
		ceiling.setAttribute("depth", this.data.depth);
		ceiling.setAttribute("position", `${0} ${this.wallProps.height} ${0}`);
		ceiling.setAttribute("static-body", "");
		ceiling.setAttribute("nav-mesh", "");

		// again... if anything goes wrong here, it's not my fault. IDC!!!
		if (this.data.wallMaterial.startsWith("url(") || this.data.wallMaterial.startsWith("#"))
			ceiling.setAttribute("material", `src: ${this.data.wallMaterial}`);
		else ceiling.setAttribute("material", `color: ${this.data.wallMaterial}`);

		// TODO: generate ceiling lights

		// NOTE: temporarily disabled)
		// this.el.sceneEl.appendChild(ceiling);
	},

	/**
	 * Generates the navigation mesh
	 */
	generateNavigationMesh() {
		const navmesh = document.createElement("a-box");
		navmesh.setAttribute("width", (this.data.width - (DEFAULT_RACK_PROPS.depth * 2) - this.wallProps.thickness).toString());
		navmesh.setAttribute("height", (this.floorProps.thickness + 0.01).toString());  // so it sticks out slightly
		navmesh.setAttribute("depth", (this.data.depth - (DEFAULT_RACK_PROPS.depth * 2) - this.wallProps.thickness).toString());
		navmesh.setAttribute("position", `0 ${-this.floorProps.thickness / 2} 0`);
		navmesh.setAttribute("material", `src: #nav-mesh-texture`);
		navmesh.setAttribute("nav-mesh", "");
		navmesh.setAttribute("visible", "false");
		this.el.sceneEl.appendChild(navmesh);
	}
});
