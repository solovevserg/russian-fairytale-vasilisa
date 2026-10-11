import {damp} from "../lib/damp";
import {clamp, smooth01} from "../lib/math";
import {riderDuration} from "./riderClock";
import {RIDERS} from "./riders";
import {KEYFRAMES} from "./scenes";
import type {RiderColor} from "./types";

/** Самая быстрая смена света, с (мгновенная — `fade: 0` у всадника). */
const MIN_FADE = 0.01;

/**
 * Когда меняется свет относительно скачки (см. RIDERS[color].light): начало
 * смены — с начала скачки, длительность — с.
 */
export function riderLight(color: RiderColor): {after: number; fade: number} {
	const duration = riderDuration(color);
	const {after, fade} = RIDERS[color].light;
	return {after: duration * after, fade: Math.max(duration * fade, MIN_FADE)};
}
const RIDER_CHAPTERS = KEYFRAMES.flatMap((k, i) =>
	k.rider ? [{index: i, color: k.rider}] : [],
);

/**
 * Прогресс, по которому считается время суток: в главе со всадником оно
 * «держится» на предыдущем кадре, пока всадник не проскачет, затем плавно
 * догоняет. Удержание действует только при подходе к главе (прогресс ≤ её индекса).
 */
export function delayedTimeProgress(
	progress: number,
	now: number,
	starts: Partial<Record<RiderColor, number>>,
): number {
	let result = progress;
	for (const {index, color} of RIDER_CHAPTERS) {
		// только при подходе к главе: дальше — обычный ход времени (иначе при
		// пролистывании вперёд всплывал бы свет предыдущей, дневной главы)
		if (progress <= index - 1 || progress > index) continue;
		const start = starts[color];
		const {after, fade} = riderLight(color);
		const lightStart = start === undefined ? Infinity : start + after;
		result = Math.min(result, index - 1 + smooth01((now - lightStart) / fade));
	}
	return result;
}

/** Какую долю времени перехода занимает ускоренный переход (назад, транзитом). */
const FAST_SHARE = 0.25;

/**
 * Шаг сглаженного прогресса за кадр: экспоненциально догоняет цель, но в
 * переходе к главе с ограничением (`timeFade` — для света, `transition` —
 * для всей сцены) — не быстрее одного перехода за столько секунд.
 */
function stepLimited(
	current: number,
	target: number,
	delta: number,
	damping: number,
	limitOf: (index: number) => number | undefined,
): number {
	const next = damp(current, target, damping, delta);
	const segment = Math.floor(Math.min(current, next));
	const fade = segment < 0 ? undefined : limitOf(segment + 1);
	if (!fade) return next;
	// ускоренно: назад листают, чтобы вернуться, а не смотреть; вперёд
	// через несколько глав — промежуточные проигрываются быстро, медленно
	// только переход к главе, на которой читатель остановится
	const passing = next < current || target > segment + 1.5;
	const limit = delta / (passing ? fade * FAST_SHARE : fade);
	return current + clamp(next - current, -limit, limit);
}

/** Шаг «прогресса света»: смена времени суток не быстрее `timeFade`. */
export function stepLight(
	current: number,
	target: number,
	delta: number,
	damping: number,
): number {
	return stepLimited(
		current,
		target,
		delta,
		damping,
		(i) => KEYFRAMES[i]?.timeFade,
	);
}

/** Шаг прогресса сцены: переход к главе не быстрее её `transition`. */
export function stepScene(
	current: number,
	target: number,
	delta: number,
	damping: number,
): number {
	return stepLimited(
		current,
		target,
		delta,
		damping,
		(i) => KEYFRAMES[i]?.transition,
	);
}

/**
 * Медленные переходы (с `transition`) идут с плавным разгоном и торможением:
 * равномерный прогресс внутри такого перехода пропускается через smoothstep.
 */
export function easeScene(progress: number): number {
	const i = Math.floor(progress);
	const t = progress - i;
	if (t === 0 || !KEYFRAMES[i + 1]?.transition) return progress;
	return i + smooth01(t);
}
