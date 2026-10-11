import {createNoise2D} from "simplex-noise";

import {smoothstep} from "../lib/math";
import {createRandom} from "../lib/random";

export const TERRAIN_SIZE = 180;
/** Радиус ровной поляны вокруг избушки. */
export const CLEARING_RADIUS = 13;
const BLEND_WIDTH = 10;
/** Направление тропинки от избушки (к камере по умолчанию). */
const PATH_DIRECTION = {x: 0.55, z: 0.835};
const PATH_HALF_WIDTH = 1.3;

const noise = createNoise2D(createRandom(1337));

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

/** Боковое смещение оси тропы: лёгкая извилистость, растущая от поляны. */
function pathWiggle(along: number): number {
	return noise(along / 14, 7.3) * Math.min(along / 10, 1) * 3;
}

/** Расстояние от точки до тропинки (луч из центра поляны). */
export function distanceToPath(x: number, z: number): number {
	const along = x * PATH_DIRECTION.x + z * PATH_DIRECTION.z;
	if (along < 0) return Math.hypot(x, z);
	const across = x * PATH_DIRECTION.z - z * PATH_DIRECTION.x;
	return Math.abs(across - pathWiggle(along));
}

export interface PathFrame {
	/** Точка на оси тропы */
	x: number;
	z: number;
	/** Единичный вектор «к избушке» вдоль тропы */
	toHutX: number;
	toHutZ: number;
}

/** Точка на оси тропы в `distance` метрах от избушки и направление к избушке. */
export function pathFrame(distance: number): PathFrame {
	const point = (d: number) => {
		const w = pathWiggle(d);
		return {
			x: PATH_DIRECTION.x * d + PATH_DIRECTION.z * w,
			z: PATH_DIRECTION.z * d - PATH_DIRECTION.x * w,
		};
	};
	const p = point(distance);
	const q = point(Math.max(distance - 0.5, 0));
	const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
	return {...p, toHutX: (q.x - p.x) / len, toHutZ: (q.z - p.z) / len};
}

function rawHeight(x: number, z: number): number {
	const hills = fbm(x, z) * 3.2 + Math.max(0, Math.hypot(x, z) - 45) * 0.12;
	return hills * wildness(x, z);
}

export function heightAt(x: number, z: number): number {
	const pathDip =
		(1 - smoothstep(0, PATH_HALF_WIDTH * 2, distanceToPath(x, z))) * 0.25;
	// у избы Василисы земля ровная — двор
	const yard = 1 - smoothstep(HOME_YARD, HOME_YARD + 8, distanceToHome(x, z));
	return rawHeight(x, z) + (HOME.ground - rawHeight(x, z)) * yard - pathDip;
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
	const yard = smoothstep(HOME_YARD, HOME_YARD + 5, distanceToHome(x, z));
	return nearPath * clearing * yard;
}

/** Радиус двора вокруг избы Василисы: без деревьев и кустов, земля ровная. */
export const HOME_YARD = 8;

/**
 * Изба Василисы — там, где тропа начинается: в 52 м от избушки, слева от тропы
 * (если смотреть на избушку). `heading` — поворот фасада к тропе.
 */
export const HOME = (() => {
	const f = pathFrame(52);
	const side = -8;
	const x = f.x - f.toHutZ * side;
	const z = f.z + f.toHutX * side;
	return {
		x,
		z,
		ground: rawHeight(x, z),
		heading: Math.atan2(f.x - x, f.z - z),
	};
})();

export function distanceToHome(x: number, z: number): number {
	return Math.hypot(x - HOME.x, z - HOME.z);
}
