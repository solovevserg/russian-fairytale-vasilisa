import {clamp01} from "./math";

/**
 * Кубическое сглаживание 0..1: медленный старт, разгон, медленная остановка
 * (симметрично относительно середины). `t` ограничивается отрезком [0, 1].
 */
export function easeInOutCubic(t: number): number {
	const x = clamp01(t);
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
