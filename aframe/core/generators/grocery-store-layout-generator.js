import {randomObjectId} from "../utils/generators";

export const DEFAULT_RACK_PROPS = Object.freeze({
	width: 6,
	depth: 0.6,
	height: 3,
	spacing: 0.25
});

export class StoreLayoutGenerator {
	#el;
	#width;
	#depth;
	#rackProps;

	#racks = [];
	#rackBounds = [];

	constructor(el, dimensions, rackProps = DEFAULT_RACK_PROPS) {
		this.#el = el;
		this.#width = dimensions.width;
		this.#depth = dimensions.depth;

		// i don't want people to be able to change the depth. because it doesn't make sense
		this.#rackProps = {...rackProps, depth: DEFAULT_RACK_PROPS.depth};
	}

	generate() {
		this.#racks = [];
		this.#rackBounds = [];

		const walls = [
			{axis: "x", fixed: -(this.#depth / 2) + this.#rackProps.depth / 2, length: this.#width, rotation: 0},
			{axis: "x", fixed: (this.#depth / 2) - this.#rackProps.depth / 2, length: this.#width, rotation: 180},
			{axis: "z", fixed: -(this.#width / 2) + this.#rackProps.depth / 2, length: this.#depth, rotation: 90},
			{axis: "z", fixed: (this.#width / 2) - this.#rackProps.depth / 2, length: this.#depth, rotation: -90}
		];

		walls
			.sort((a, b) => b.length - a.length)
			.forEach(wall => this.#fillWall(wall.axis, wall.fixed, wall.length, wall.rotation));
	}

	getRacks() {
		return this.#racks;
	}

	getRackProperties() {
		return this.#rackProps;
	}

	/**
	 * Simple aabb check (axis-aligned bounding box)
	 * @param a
	 * @param b
	 * @returns {boolean}
	 */
	#overlaps(a, b) {
		return (
			Math.abs(a.x - b.x) < (a.w / 2 + b.w / 2) &&
			Math.abs(a.z - b.z) < (a.d / 2 + b.d / 2)
		);
	}

	#createFiller(x, z) {
		const {width: rw, depth: rd} = this.#rackProps;
		const plantSize = Math.min(rw, rd) * 0.6;

		const bounds = {
			x,
			z,
			w: plantSize,
			d: plantSize
		};

		for (const existing of this.#rackBounds) if (this.#overlaps(bounds, existing)) return false;

		// TODO: make sure we fill the space with some more models
		const plant = document.createElement("a-entity");
		plant.setAttribute("gltf-model", "#plant");
		plant.setAttribute("position", `${x} 0 ${z}`);

		this.#el.appendChild(plant);
		this.#rackBounds.push(bounds);

		return true;
	}

	#tryCreateRack(x, z, rotationY = 0) {
		const {width: rw, depth: rd, height: rh} = this.#rackProps;

		const isRotated = rotationY % 180 !== 0;
		const bounds = {
			x,
			z,
			w: isRotated ? rd : rw,
			d: isRotated ? rw : rd
		};

		// if our rack overlaps with another rack, we fail
		for (const existing of this.#rackBounds) {
			if (this.#overlaps(bounds, existing)) {
				this.#createFiller(x, z);
				return false;
			}
		}

		// parent entity (the rack)
		// NOTE: do NOT give this parent the "static-body" attribute, because aframe will merge everything and treat
		// 	it as a singular entity making it impossible to put items on the racks
		const rack = document.createElement("a-entity");
		rack.setAttribute("id", `rack-${randomObjectId()}`);
		rack.setAttribute("primitive-grocery-rack", {
			width: rw,
			height: rh,
			depth: rd
		});
		rack.setAttribute("position", `${x} 0 ${z}`);
		rack.setAttribute("rotation", `0 ${rotationY} 0`);

		// pillar dimensions
		const pw = 0.05;
		const ph = rh;
		const pd = rd;

		const horizontalOffsetFromCenter = (rw / 2) - (pw / 2);

		const leftPillar = document.createElement("a-box");
		leftPillar.setAttribute("width", pw);
		leftPillar.setAttribute("height", ph);
		leftPillar.setAttribute("depth", pd);
		leftPillar.setAttribute("position", `${-horizontalOffsetFromCenter} ${ph / 2} 0`);
		leftPillar.setAttribute("color", "brown");
		leftPillar.setAttribute("static-body", "shape: box");
		leftPillar.classList.add("rack-pillar");

		const rightPillar = document.createElement("a-box");
		rightPillar.setAttribute("width", pw);
		rightPillar.setAttribute("height", ph);
		rightPillar.setAttribute("depth", pd);
		rightPillar.setAttribute("position", `${horizontalOffsetFromCenter} ${ph / 2} 0`);
		rightPillar.setAttribute("color", "brown");
		rightPillar.setAttribute("static-body", "shape: box");
		rightPillar.classList.add("rack-pillar");

		// assemble rack
		rack.appendChild(leftPillar);
		rack.appendChild(rightPillar);

		this.#el.appendChild(rack);
		this.#racks.push(rack);
		this.#rackBounds.push(bounds);

		return true;
	}

	#fillWall(axis, fixed, length, rotation) {
		const {width: rw, spacing} = this.#rackProps;

		// center-to-center distance between racks, ensures (racks + spacing) don't overlap
		const step = rw + spacing;

		// calc how many racks can fit along this wall
		const rackSlots = Math.floor(length / step);

		// iterate over each rack slot along the wall
		for (let slot = 0; slot < rackSlots; slot++) {

			// center each rack within its slot along the wall
			const offset = -length / 2 + (slot + 0.5) * step;

			// determine final world position based on wall orientation
			let x = 0, z = 0;
			if (axis === "x") {
				x = offset;  // move along wall
				z = fixed;  // stay flush against wall
			} else {
				x = fixed;  // stay flush against wall
				z = offset;  // move along wall
			}

			// finally...
			this.#tryCreateRack(x, z, rotation);
		}
	}
}
