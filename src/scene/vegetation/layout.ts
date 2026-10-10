import { createNoise2D } from "simplex-noise";
import { createRandom } from "../random";
import {
	CLEARING_RADIUS,
	distanceToPath,
	heightAt,
	wildness,
} from "../terrain";

export interface PlantPlacement {
	x: number;
	y: number;
	z: number;
	rotation: number;
	scale: number;
	/** Оттенок 0..1 — вариация цвета. */
	tint: number;
}

const patches = createNoise2D(createRandom(4242));

/** Пятна высокой травы: 0..1. */
export function tallGrassPatch(x: number, z: number): number {
	return patches(x / 9, z / 9) * 0.5 + 0.5;
}

/** Вокруг ног избушки трава вытоптана. */
const HUT_CLEAR_RADIUS = 1.4;

/** Плотность низкой травы: густо на поляне, реже в лесу, нет на тропе. */
export function grassDensity(x: number, z: number): number {
	if (Math.hypot(x, z) < HUT_CLEAR_RADIUS) return 0;
	const path = distanceToPath(x, z);
	const onPath = 1 - Math.min(Math.max((path - 0.6) / 1.2, 0), 1);
	const wild = wildness(x, z);
	return (0.95 - wild * 0.65) * (1 - onPath);
}

/** Плотность высокой травы: пятнами у края поляны и вдоль тропы. */
export function tallGrassDensity(x: number, z: number): number {
	const r = Math.hypot(x, z);
	if (r < 5) return 0;
	const path = distanceToPath(x, z);
	if (path < 1.6) return 0;
	const edge = 1 - Math.min(Math.abs(r - CLEARING_RADIUS) / 7, 1);
	const roadside = 1 - Math.min(Math.abs(path - 2.4) / 1.5, 1);
	const patch = Math.max(0, (tallGrassPatch(x, z) - 0.45) / 0.55);
	return Math.min(1, (edge * 0.8 + roadside * 0.6 + 0.15) * patch);
}

/** Плотность кустов: у кромки леса, не на тропе и не у забора. */
export function bushDensity(x: number, z: number): number {
	const r = Math.hypot(x, z);
	if (r < CLEARING_RADIUS - 1.5) return 0;
	if (distanceToPath(x, z) < 2.6) return 0;
	const edge = 1 - Math.min(Math.abs(r - (CLEARING_RADIUS + 3)) / 5, 1);
	return edge * 0.9 + (r > CLEARING_RADIUS + 8 ? 0.15 : 0);
}

/**
 * Разбрасывает растения по сетке с дрожанием: шаг `spacing`, вероятность
 * появления — `density(x, z)`. Детерминировано по seed.
 */
export function scatter({
	seed,
	radius,
	spacing,
	density,
	scale,
}: {
	seed: number;
	radius: number;
	spacing: number;
	density: (x: number, z: number) => number;
	scale: [number, number];
}): PlantPlacement[] {
	const random = createRandom(seed);
	const plants: PlantPlacement[] = [];
	const steps = Math.ceil((radius * 2) / spacing);
	for (let i = 0; i < steps; i++) {
		for (let j = 0; j < steps; j++) {
			const x = -radius + (i + random()) * spacing;
			const z = -radius + (j + random()) * spacing;
			const roll = random();
			const rotation = random() * Math.PI * 2;
			const s = scale[0] + random() * (scale[1] - scale[0]);
			const tint = random();
			if (Math.hypot(x, z) > radius || roll > density(x, z)) continue;
			plants.push({ x, y: heightAt(x, z), z, rotation, scale: s, tint });
		}
	}
	return plants;
}
