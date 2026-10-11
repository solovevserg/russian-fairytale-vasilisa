/**
 * Покадровое сглаживание величин, не зависящее от частоты кадров. Шаг кадра
 * ограничивается `MAX_FRAME_DT`: после паузы вкладки или долгой загрузки
 * значения не перескакивают к цели одним рывком.
 */

import { clamp01 } from "./math";

/** Самый длинный учитываемый шаг кадра, с. */
export const MAX_FRAME_DT = 0.1;

/** Шаг кадра `delta` (с), ограниченный `MAX_FRAME_DT`. */
export function frameDt(delta: number): number {
	return Math.min(delta, MAX_FRAME_DT);
}

/**
 * Доля оставшегося пути, которую экспоненциальное догоняние проходит за кадр:
 * `rate` — скорость (1/с, больше — резче), `delta` — шаг кадра, с.
 */
export function dampFactor(rate: number, delta: number): number {
	return 1 - Math.exp(-rate * frameDt(delta));
}

/**
 * Экспоненциально приближает `current` к `target` со скоростью `rate` (1/с)
 * за кадр длиной `delta` (с). Цели никогда не достигает ровно.
 */
export function damp(
	current: number,
	target: number,
	rate: number,
	delta: number,
): number {
	return current + (target - current) * dampFactor(rate, delta);
}

/**
 * Линейный ход 0..1 туда и обратно: пока `rising`, растёт к 1 за `upSeconds`,
 * иначе спадает к 0 за `downSeconds`. Для появления и ухода с разной
 * скоростью (например, медленный подъём камеры и быстрый возврат).
 */
export function ramp(
	current: number,
	rising: boolean,
	upSeconds: number,
	downSeconds: number,
	delta: number,
): number {
	const step = frameDt(delta) / (rising ? upSeconds : -downSeconds);
	return clamp01(current + step);
}
