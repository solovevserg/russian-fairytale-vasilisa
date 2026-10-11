import { KEYFRAMES, type RiderColor } from "./keyframes";
import { riderDuration } from "./riderClock";

/**
 * Когда меняется свет относительно скачки: `after` — доля пути всадника до
 * начала смены, `fade` — длительность смены, с. Белый — светает вместе со
 * скачкой; чёрный — темнеет, пока он кружит, и к его уходу в чащу — ночь;
 * красный время не
 * меняет вовсе (рассвет — в следующей главе «Восход»).
 */
export const RIDER_LIGHT: Record<RiderColor, { after: number; fade: number }> =
	{
		white: { after: 0, fade: riderDuration("white") },
		red: { after: 0, fade: 0.01 },
		black: { after: 0.05, fade: riderDuration("black") * 0.9 },
	};
const RIDER_CHAPTERS = KEYFRAMES.flatMap((k, i) =>
	k.rider ? [{ index: i, color: k.rider }] : [],
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
	for (const { index, color } of RIDER_CHAPTERS) {
		// только при подходе к главе: дальше — обычный ход времени (иначе при
		// пролистывании вперёд всплывал бы свет предыдущей, дневной главы)
		if (progress <= index - 1 || progress > index) continue;
		const start = starts[color];
		const { after, fade } = RIDER_LIGHT[color];
		const lightStart =
			start === undefined ? Infinity : start + riderDuration(color) * after;
		const t = Math.min(Math.max((now - lightStart) / fade, 0), 1);
		result = Math.min(result, index - 1 + t * t * (3 - 2 * t));
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
	const dt = Math.min(delta, 0.1);
	const next = current + (target - current) * (1 - Math.exp(-damping * dt));
	const segment = Math.floor(Math.min(current, next));
	const fade = segment < 0 ? undefined : limitOf(segment + 1);
	if (!fade) return next;
	// ускоренно: назад листают, чтобы вернуться, а не смотреть; вперёд
	// через несколько глав — промежуточные проигрываются быстро, медленно
	// только переход к главе, на которой читатель остановится
	const passing = next < current || target > segment + 1.5;
	const limit = delta / (passing ? fade * FAST_SHARE : fade);
	return current + Math.max(-limit, Math.min(limit, next - current));
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
	return i + t * t * (3 - 2 * t);
}
