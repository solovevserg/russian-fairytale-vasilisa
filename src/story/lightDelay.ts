import { KEYFRAMES, RIDER_PATHS, type RiderColor } from "./keyframes";

/** Через какую долю скачки начинает меняться свет и сколько секунд длится смена. */
export const LIGHT_AFTER_RIDE = 0.7;
export const LIGHT_FADE = 2.5;
const RIDER_CHAPTERS = KEYFRAMES.flatMap((k, i) =>
	k.rider ? [{ index: i, color: k.rider }] : [],
);

/**
 * Прогресс, по которому считается время суток: в главе со всадником оно
 * «держится» на предыдущем кадре, пока всадник не проскачет, затем плавно
 * догоняет. Если глава пролистана дальше середины следующей, задержки нет.
 */
export function delayedTimeProgress(
	progress: number,
	now: number,
	starts: Partial<Record<RiderColor, number>>,
): number {
	let result = progress;
	for (const { index, color } of RIDER_CHAPTERS) {
		if (progress <= index - 1 || progress > index + 0.5) continue;
		const start = starts[color];
		const lightStart =
			start === undefined
				? Infinity
				: start + RIDER_PATHS[color].duration * LIGHT_AFTER_RIDE;
		const t = Math.min(Math.max((now - lightStart) / LIGHT_FADE, 0), 1);
		result = Math.min(result, index - 1 + t * t * (3 - 2 * t));
	}
	return result;
}
