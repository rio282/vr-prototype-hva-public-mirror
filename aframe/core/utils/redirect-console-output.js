import { DEBUG_MODE } from "@/aframe/settings.js";

export function redirectConsoleOutputForAFrame() {
	const container = document.createElement("div");
	container.id = "toast-container";
	document.body.prepend(container);

	function showToast(message, type = "ANY", duration = 5000) {
		const toast = document.createElement("div");
		toast.className = "toast";
		toast.innerHTML = message;

		let bgColor;
		switch (type.toUpperCase()) {
			case "ERROR":
				bgColor = "#ff4d4f";
				break;
			case "WARN":
				bgColor = "#e9d502";
				break;
			case "DEBUG":
				bgColor = "#203354";
				break;
			default:
				bgColor = "#002147";
				break;
		}
		toast.style.background = bgColor;

		container.appendChild(toast);

		requestAnimationFrame(() => toast.classList.add("show"));
		setTimeout(() => {
			toast.classList.add("fade-out");
			toast.addEventListener("animationend", () => toast.remove());
		}, duration);
	}

	window.onunhandledrejection = (event) =>
		showToast(`Unhandled rejection: ${event.reason}`, "ERROR");

	/**
	 * Got this from ChatGPT...
	 * @param args
	 * @returns {*|string}
	 * @private
	 */
	const _format = (...args) => {
		if (args.length === 0) return "";

		if (typeof args[0] !== "string") {
			return args
				.map((arg) =>
					typeof arg === "object" ? JSON.stringify(arg) : String(arg),
				)
				.join(" ");
		}

		let index = 1;
		let result = args[0].replace(/%[sdifoO]/g, () => {
			if (index >= args.length) return "";
			const value = args[index++];
			return typeof value === "object"
				? JSON.stringify(value)
				: String(value);
		});

		if (index < args.length) {
			result +=
				" " +
				args
					.slice(index)
					.map((v) =>
						typeof v === "object" ? JSON.stringify(v) : String(v),
					)
					.join(" ");
		}

		return result;
	};

	// replace the actual functions
	const _consolewarn = console.warn;
	const _consoleerror = console.error;
	const _consoledebug = console.debug;

	console.warn = function (...args) {
		_consolewarn(...args);
		showToast(`<b>Warning:</b> ${_format(...args)}`, "WARN");
	};
	console.error = function (...args) {
		_consoleerror(...args);
		showToast(`<b>Error:</b> ${_format(...args)}`, "ERROR", 7500);
	};
	console.debug = function (...args) {
		_consoledebug(...args);
		showToast(`<b>Debug:</b> ${_format(...args)}`, "DEBUG", 3000);
	};
}
