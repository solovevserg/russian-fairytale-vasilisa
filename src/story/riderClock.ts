import {quality} from "../scene/quality";
import {RIDER_PATHS, type RiderColor} from "./keyframes";

/**
 * Когда всадник начал скакать (clock.elapsedTime сцены). Пишет Riders,
 * читает CameraRig: свет меняется только после того, как всадник проскакал.
 */
export const riderStarts: Partial<Record<RiderColor, number>> = {};

/**
 * Сколько длится скачка, с. На слабых устройствах (уровень low) все всадники
 * скачут медленнее, на телефонах (medium) — чёрный: иначе их не разглядеть.
 */
export function riderDuration(color: RiderColor): number {
	const pace =
		quality.tier === "low"
			? 0.75
			: quality.tier === "medium" && color === "black"
				? 0.85
				: 1;
	return RIDER_PATHS[color].duration / pace;
}
