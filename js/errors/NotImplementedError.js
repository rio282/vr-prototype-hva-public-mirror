export class NotImplementedError extends Error {
	constructor(message = "Method not implemented.") {
		super(message);
		this.name = "NotImplementedError";
	}
}
