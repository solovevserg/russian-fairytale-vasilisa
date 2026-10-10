import { type Object3D, Vector3 } from "three";

const scratch = new Vector3();

/**
 * Показывает/прячет объект, не меняя `visible`. Если спрятать группу со светом
 * через `visible = false`, меняется число источников света в сцене и three.js
 * перекомпилирует все шейдеры — рывок на полсекунды. Поэтому прячем масштабом,
 * а свет гасим интенсивностью (см. `isShown`).
 */
export function setShown(object: Object3D, shown: boolean) {
	object.userData.baseScale ??= object.scale.x;
	object.scale.setScalar(shown ? object.userData.baseScale : 1e-4);
}

/** Виден ли объект с учётом спрятанных масштабом родителей. */
export function isShown(object: Object3D): boolean {
	object.getWorldScale(scratch);
	return scratch.x > 1e-3;
}
