import {useGLTF} from "@react-three/drei";
import {useMemo} from "react";
import type {BufferGeometry, Material, Mesh, Object3D} from "three";

import {quality} from "./quality";

/**
 * Модели персонажей и избушки (готовит scripts/prepare-models.ts, Meshopt).
 * На телефонах тяжёлые модели — облегчённые копии `<имя>-mobile.glb`.
 */
const base = `${import.meta.env.BASE_URL}models/`;
const mobile = quality.lightAssets ? "-mobile" : "";
export const MODEL_URLS = {
	hut: `${base}hut${mobile}.glb`,
	babaYaga: `${base}baba-yaga.glb`,
	vasilisa: `${base}vasilisa${mobile}.glb`,
	skull: `${base}skull.glb`,
	house: `${base}house.glb`,
	bird: `${base}bird.glb`,
} as const;

/**
 * Модели, которые не нужны в начале сказки: грузятся, только когда читатель
 * подходит к главе, где они появляются (см. Deferred в SceneCanvas).
 */
const DEFERRED_MODELS = new Set<keyof typeof MODEL_URLS>(["hut", "babaYaga"]);

for (const [name, url] of Object.entries(MODEL_URLS)) {
	if (!DEFERRED_MODELS.has(name as keyof typeof MODEL_URLS)) {
		useGLTF.preload(url);
	}
}

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

/** Высота модели черепа, м (см. scripts/prepare-models.ts). */
export const SKULL_HEIGHT = 0.25;
/** Глазница (правая; левая — зеркально) от центра черепа, м. */
export const SKULL_EYE: [number, number, number] = [0.045, 0.015, 0.06];

/**
 * Геометрия черепа (Quaternius, CC0) с центром в середине черепа — для
 * инстансов на частоколе и черепа-светоча. Лицо смотрит в +Z.
 */
export function useSkullGeometry(): BufferGeometry {
	const {scene} = useGLTF(MODEL_URLS.skull);
	return useMemo(() => {
		let geometry: BufferGeometry | null = null;
		scene.updateMatrixWorld(true);
		scene.traverse((child) => {
			const mesh = child as Mesh;
			if (!mesh.isMesh || geometry) return;
			geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
		});
		if (!geometry) throw new Error("skull.glb: нет меша");
		return (geometry as BufferGeometry).translate(0, -SKULL_HEIGHT / 2, 0);
	}, [scene]);
}
