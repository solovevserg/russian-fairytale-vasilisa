import { createNoise2D } from "simplex-noise";
import { createRandom } from "./random";

export const TERRAIN_SIZE = 180;
/** Радиус ровной поляны вокруг избушки. */
export const CLEARING_RADIUS = 13;
const BLEND_WIDTH = 10;
/** Направление тропинки от избушки (к камере по умолчанию). */
const PATH_DIRECTION = { x: 0.55, z: 0.835 };
const PATH_HALF_WIDTH = 1.3;

const noise = createNoise2D(createRandom(1337));

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
	return t * t * (3 - 2 * t);
}

function fbm(x: number, z: number): number {
	let value = 0;
	let amplitude = 1;
	let frequency = 1 / 40;
	for (let octave = 0; octave < 4; octave++) {
		value += amplitude * noise(x * frequency, z * frequency);
		amplitude *= 0.5;
		frequency *= 2;
	}
	return value;
}

/** Вес «дикости» рельефа: 0 на поляне, 1 в лесу. */
export function wildness(x: number, z: number): number {
	const r = Math.hypot(x, z);
	return smoothstep(CLEARING_RADIUS, CLEARING_RADIUS + BLEND_WIDTH, r);
}

/** Расстояние от точки до тропинки (луч из центра поляны). */
export function distanceToPath(x: number, z: number): number {
	const along = x * PATH_DIRECTION.x + z * PATH_DIRECTION.z;
	if (along < 0) return Math.hypot(x, z);
	// знаковое расстояние поперёк тропы + лёгкая извилистость, растущая от поляны
	const across = x * PATH_DIRECTION.z - z * PATH_DIRECTION.x;
	const wiggle = noise(along / 14, 7.3) * Math.min(along / 10, 1) * 3;
	return Math.abs(across - wiggle);
}

export function heightAt(x: number, z: number): number {
	const hills = fbm(x, z) * 3.2 + Math.max(0, Math.hypot(x, z) - 45) * 0.12;
	const pathDip =
		(1 - smoothstep(0, PATH_HALF_WIDTH * 2, distanceToPath(x, z))) * 0.25;
	return hills * wildness(x, z) - pathDip;
}

/** Плотность леса в точке: 0 — деревьев нет (поляна, тропа), 1 — чаща. */
export function forestDensity(x: number, z: number): number {
	const nearPath = smoothstep(
		PATH_HALF_WIDTH + 2.5,
		PATH_HALF_WIDTH + 6,
		distanceToPath(x, z),
	);
	const clearing = smoothstep(
		CLEARING_RADIUS - 1,
		CLEARING_RADIUS + 3,
		Math.hypot(x, z),
	);
	return nearPath * clearing;
}
