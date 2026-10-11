import { useGLTF } from "@react-three/drei";
import type { Material, Mesh, Object3D } from "three";

/** Модели персонажей и избушки (готовит scripts/prepare-models.ts, Meshopt). */
const base = `${import.meta.env.BASE_URL}models/`;
export const MODEL_URLS = {
	hut: `${base}hut.glb`,
	babaYaga: `${base}baba-yaga.glb`,
	vasilisa: `${base}vasilisa.glb`,
} as const;

for (const url of Object.values(MODEL_URLS)) useGLTF.preload(url);

/** Включает тени у всех мешей модели. */
export function enableShadows(root: Object3D) {
	root.traverse((child) => {
		const mesh = child as Mesh;
		if (!mesh.isMesh) return;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
	});
}

/** Все материалы модели (для подсветки окон и т. п.). */
export function materialsOf(root: Object3D): Material[] {
	const result = new Set<Material>();
	root.traverse((child) => {
		const mesh = child as Mesh;
		if (!mesh.isMesh) return;
		for (const m of Array.isArray(mesh.material)
			? mesh.material
			: [mesh.material])
			result.add(m);
	});
	return [...result];
}
