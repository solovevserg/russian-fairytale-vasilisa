/**
 * Числовые помощники без знания о сцене и истории: ограничение, интерполяция,
 * сглаженная ступенька, углы. Все функции чистые.
 */

/**
 * Ограничивает `value` отрезком [`min`, `max`].
 *
 * @example clamp(5, 0, 1) // 1
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Ограничивает `value` отрезком [0, 1]. */
export function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

/**
 * Линейная интерполяция: `a` при `t = 0`, `b` при `t = 1`. `t` не
 * ограничивается — за пределами [0, 1] продолжает прямую.
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Обратная к `lerp`: какая доля пути от `a` к `b` пройдена в `value`.
 * Не ограничивается; при `a === b` — 0.
 */
export function inverseLerp(a: number, b: number, value: number): number {
	return a === b ? 0 : (value - a) / (b - a);
}

/**
 * Сглаженная ступенька 0..1 по доле `t`: плавный разгон и торможение
 * (3t² − 2t³). `t` ограничивается отрезком [0, 1].
 */
export function smooth01(t: number): number {
	const c = clamp01(t);
	return c * c * (3 - 2 * c);
}

/**
 * Сглаженная ступенька как в GLSL: 0 до `edge0`, 1 после `edge1`, между —
 * плавно. `edge0 > edge1` даёт обратную ступеньку.
 *
 * @example smoothstep(0, 10, 5) // 0.5
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
	return smooth01((x - edge0) / (edge1 - edge0));
}

/** Угол, приведённый к (−π, π], рад. */
export function wrapAngle(angle: number): number {
	return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Интерполяция угла по кратчайшей дуге (рад): из `a` в `b` не через полный
 * оборот, даже если они записаны как 0.1 и 2π − 0.1.
 */
export function lerpAngle(a: number, b: number, t: number): number {
	return a + wrapAngle(b - a) * t;
}
