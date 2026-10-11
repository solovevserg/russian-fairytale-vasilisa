import {heightAt, pathFrame} from "../scene/terrain";
import type {Vec3} from "./types";

/**
 * Места сказки на карте — по имени, со связями между ними. Избушка Бабы Яги
 * в центре поляны (0, 0), окно смотрит на +Z, тропа уходит на +X+Z к избе
 * Василисы; солнце встаёт со стороны избушки.
 */

/** Точка на высоте `height` над землёй. */
export function aboveGround(x: number, z: number, height: number): Vec3 {
	return [x, heightAt(x, z) + height, z];
}

/**
 * Точка у тропы: `distance` метров от избушки по тропе, `side` — вбок
 * (вправо, если смотреть на избушку), `height` — над землёй.
 */
export function onPath(distance: number, height: number, side = 0): Vec3 {
	const f = pathFrame(distance);
	// правая сторона для идущего к избушке: поворот (toHutX, toHutZ) на -90°
	return aboveGround(f.x - f.toHutZ * side, f.z + f.toHutX * side, height);
}

/** Поворот вокруг Y, при котором стоящий в `from` смотрит на `to` ([x, z]). */
export function facing(
	from: readonly [number, number],
	to: readonly [number, number],
): number {
	return Math.atan2(to[0] - from[0], to[1] - from[1]);
}

/** Место у тропы: метров от избушки по тропе и вбок (как в onPath). */
export interface PathSpot {
	path: number;
	side: number;
}

/** Василиса у своей избы, в начале тропы (пролог, эпилог, подлёт камеры). */
export const HOME_SPOT: PathSpot = {path: 51, side: -2.6};

/** Ворота частокола избушки — на тропе. */
export const GATE_SPOT: PathSpot = {path: 8.5, side: 0};

/** Высота земли под избушкой. */
export const HUT_GROUND = heightAt(0, 0);

/**
 * Крыльцо избушки — настил с перилами перед дверью, как он есть в модели
 * (замерено по вершинам hut.glb). Дверь смотрит на ворота и тропу.
 */
export const PORCH = {
	/** Единичный вектор от центра избы к двери (на ворота). */
	dir: [0.55, 0.835] as [number, number],
	/** Расстояние от центра избы до начала настила, м. */
	wall: 2.35,
	/** Высота настила над землёй, м. */
	height: 2.51,
	/** Глубина (от стены) и ширина настила, м. */
	depth: 0.65,
	width: 2.4,
};

/** Высота настила крыльца (над уровнем моря сцены). */
export const PORCH_FLOOR = HUT_GROUND + PORCH.height;

/** Центр настила крыльца [x, z]. */
export const PORCH_CENTER: [number, number] = [
	PORCH.dir[0] * (PORCH.wall + PORCH.depth / 2),
	PORCH.dir[1] * (PORCH.wall + PORCH.depth / 2),
];

/** Середина избушки на высоте сруба — откуда слышны её скрипы. */
export const HUT_BODY: Vec3 = [0, HUT_GROUND + 4.5, 0];

/**
 * Глава «Череп-светоч»: Баба Яга у избы протягивает череп, Василиса стоит
 * лицом к ней — и обе смотрят друг на друга.
 */
export const SKULL_HANDOVER = {
	babaYaga: [1.8, 5.3] as [number, number],
	vasilisa: [4.9, 7.4] as [number, number],
};

/** Где стоит Баба Яга, протягивая череп (глава «Череп-светоч»). */
export const BABA_YAGA_STAND = {
	x: SKULL_HANDOVER.babaYaga[0],
	z: SKULL_HANDOVER.babaYaga[1],
	heading: facing(SKULL_HANDOVER.babaYaga, SKULL_HANDOVER.vasilisa),
};
