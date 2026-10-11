import { createNoise2D } from "simplex-noise";

import { smoothstep } from "../lib/math";
import { createRandom } from "../lib/random";
import { distanceToPath, TERRAIN_SIZE, wildness } from "./terrain";

const edgeNoise = createNoise2D(createRandom(808));
const patchNoise = createNoise2D(createRandom(909));

/** Полуширина утоптанной тропы, м. */
const PATH_HALF_WIDTH = 0.75;

/**
 * Веса материалов земли в точке: [трава поляны, лесная подстилка, тропа].
 * Край тропы рваный: ширина гуляет по шуму, кое-где трава заходит на тропу.
 */
export function splatWeights(x: number, z: number): [number, number, number] {
	const ragged =
		edgeNoise(x * 0.9, z * 0.9) * 0.22 + edgeNoise(x * 3.1, z * 3.1) * 0.1;
	const d = distanceToPath(x, z) - ragged;
	const path =
		1 - smoothstep(PATH_HALF_WIDTH - 0.25, PATH_HALF_WIDTH + 0.35, d);

	const wild = wildness(x, z);
	const patches = patchNoise(x / 7, z / 7) * 0.5 + 0.5;
	// в лесу подстилка, но с полянками травы; на поляне — трава с проплешинами
	const forest = wild * (0.55 + patches * 0.45);
	const grass =
		(1 - wild) * (0.85 + (1 - patches) * 0.15) + wild * (1 - patches) * 0.3;
	return [grass * (1 - path), forest * (1 - path), path];
}

/**
 * Маска весов на всю землю: RGBA8, R — трава, G — лес, B — тропа.
 * Ориентация совпадает с uv плоскости земли (v = 1 у z = -size/2).
 */
export function buildSplatMask(size: number): Uint8Array {
	const data = new Uint8Array(size * size * 4);
	for (let row = 0; row < size; row++) {
		const v = (row + 0.5) / size;
		const z = (0.5 - v) * TERRAIN_SIZE;
		for (let col = 0; col < size; col++) {
			const u = (col + 0.5) / size;
			const x = (u - 0.5) * TERRAIN_SIZE;
			const [g, f, p] = splatWeights(x, z);
			const i = (row * size + col) * 4;
			data[i] = Math.round(g * 255);
			data[i + 1] = Math.round(f * 255);
			data[i + 2] = Math.round(p * 255);
			data[i + 3] = 255;
		}
	}
	return data;
}
