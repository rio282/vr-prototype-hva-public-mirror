require("aframe");
require("aframe-extras");

/**
 * Returns true if the entity is within `radius` of the player.
 * @param {AFRAME.Entity} entity - The entity to check.
 * @param {AFRAME.Entity} player - The player entity.
 * @param {number} radius - Distance threshold.
 */
export function isPlayerNearby(entity, player, radius = 1) {
	if (!entity || !player)
		throw TypeError("Both the entity and player must exist.");

	const entityPos = new THREE.Vector3();
	const playerPos = new THREE.Vector3();

	entity.object3D.getWorldPosition(entityPos);
	player.object3D.getWorldPosition(playerPos);

	return entityPos.distanceTo(playerPos) <= radius;
}
