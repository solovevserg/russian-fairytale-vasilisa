import { KEYFRAMES, RIDER_PATHS, type RiderColor } from "./keyframes";

/**
 * Когда меняется свет относительно скачки: `after` — доля пути всадника до
 * начала смены, `fade` — длительность смены, с. Белый — светает вместе со
 * скачкой; чёрный — ночь опускается, когда он проскакал; красный время не
 * меняет вовсе (рассвет — в следующей главе «Восход»).
 */
export const RIDER_LIGHT: Record<RiderColor, { after: number; fade: number }> =
	{
		white: { after: 0, fade: RIDER_PATHS.white.duration },
		red: { after: 0, fade: 0.01 },
		black: { after: 0.7, fade: 2.5 },
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
			start === undefined
				? Infinity
				: start + RIDER_PATHS[color].duration * after;
		const t = Math.min(Math.max((now - lightStart) / fade, 0), 1);
		result = Math.min(result, index - 1 + t * t * (3 - 2 * t));
	}
	return result;
}
