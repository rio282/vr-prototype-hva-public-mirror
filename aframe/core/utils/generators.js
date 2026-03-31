export function randomObjectId() {
	return crypto.getRandomValues(new Uint8Array(4)) // 4 bytes = 8 hex digits
		.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
