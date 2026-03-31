/**
 * Renders a help table for the provided keymap in a fixed overlay.
 *
 * **Note:** The table is fully regenerated every time this function is called.
 * This is because the `keymap` object may change dynamically, so we do not
 * attempt to simply toggle visibility of a pre-existing table.
 *
 * P.S. : Yes, I let ChatGPT write my jsdocs...
 *
 * @param {Object<string, string>} keymap - An object mapping key names to their actions/values.
 *
 * @example
 * const keymap = {
 *   "W": "Move forward",
 *   "S": "Move backward",
 *   "Space": "Jump"
 * };
 * renderKeymapTable(keymap);
 */
export function renderKeymapTable(keymap) {
	let container = document.querySelector("#keymap-help-container");
	if (container) return container.remove();

	container = document.createElement("div");
	container.id = "keymap-help-container";

	container.className = `
		position-fixed
		top-50
		start-50
		translate-middle
		bg-dark
		bg-opacity-75
		text-white
		font-monospace
		small
		lh-sm
		p-3
		rounded
		shadow-lg
	`;

	container.style.zIndex = "1080"; // ensure above most UI

	const table = document.createElement("table");
	table.className =
		"table table-dark table-sm table-bordered mb-0 align-middle";

	const thead = document.createElement("thead");
	thead.innerHTML = `
		<tr>
			<th scope="col">Key</th>
			<th scope="col">Value</th>
		</tr>
	`;

	const tbody = document.createElement("tbody");

	Object.entries(keymap).forEach(([key, value]) => {
		const row = document.createElement("tr");

		row.innerHTML = `
			<td>${key}</td>
			<td>${value}</td>
		`;

		tbody.appendChild(row);
	});

	table.appendChild(thead);
	table.appendChild(tbody);
	container.appendChild(table);
	document.body.prepend(container);
}
