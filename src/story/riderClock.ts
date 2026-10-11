import type { RiderColor } from "./keyframes";

/**
 * Когда всадник начал скакать (clock.elapsedTime сцены). Пишет Riders,
 * читает CameraRig: свет меняется только после того, как всадник проскакал.
 */
export const riderStarts: Partial<Record<RiderColor, number>> = {};
