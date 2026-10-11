import {type QualityTier, quality} from "../scene/quality";
import {RIDERS} from "./riders";
import type {RiderColor} from "./types";

/**
 * Когда всадник начал скакать (clock.elapsedTime сцены). Пишет Riders,
 * читает CameraRig: свет меняется только после того, как всадник проскакал.
 */
export const riderStarts: Partial<Record<RiderColor, number>> = {};

/**
 * Сколько длится скачка, с: на слабых устройствах — медленнее
 * (`RIDERS[color].slowerOn`), иначе всадника не разглядеть.
 */
export function riderDuration(
	color: RiderColor,
	tier: QualityTier = quality.tier,
): number {
	const {duration, slowerOn} = RIDERS[color];
	return duration * (slowerOn[tier] ?? 1);
}
