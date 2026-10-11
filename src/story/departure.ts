import { pathFrame } from "../scene/terrain";

/**
 * «Череп-светоч»: Василиса стоит лицом к Бабе Яге, потом разворачивается и
 * уходит по тропе в лес, изредка поглядывая то направо, то налево.
 * Сценарий однократный — время `t` идёт с входа в главу.
 */
export const DEPARTURE = {
	/** Сколько стоит лицом к Бабе Яге, с. */
	stand: 1.6,
	/** Сколько разворачивается, с. */
	turn: 1.3,
	/** Скорость шага, м/с. */
	speed: 1.05,
	/** Как далеко уходит по тропе, м. */
	length: 34,
	/** За сколько метров сходит с места на ось тропы. */
	merge: 4,
};

export interface DeparturePose {
	x: number;
	z: number;
	heading: number;
}

const smooth = (t: number) => {
	const c = Math.min(Math.max(t, 0), 1);
	return c * c * (3 - 2 * c);
};

function wrapAngle(a: number): number {
	return Math.atan2(Math.sin(a), Math.cos(a));
}

const cache = { x: Number.NaN, z: Number.NaN, d: 0 };

/** Ближайшая точка тропы к [x, z] — расстояние от избушки, м (с кэшем: точка старта одна). */
function distanceAlongPath(x: number, z: number): number {
	if (x === cache.x && z === cache.z) return cache.d;
	let best = 0;
	let bestError = Number.POSITIVE_INFINITY;
	for (let d = 0; d <= 60; d += 0.25) {
		const f = pathFrame(d);
		const error = Math.hypot(f.x - x, f.z - z);
		if (error < bestError) {
			bestError = error;
			best = d;
		}
	}
	Object.assign(cache, { x, z, d: best });
	return best;
}

/** Направление «прочь от избушки» в точке тропы. */
function awayHeading(distance: number): number {
	const f = pathFrame(distance);
	return Math.atan2(-f.toHutX, -f.toHutZ);
}

/**
 * Поза в момент `t` (с). `start` — где стоит, `facing` — поворот лицом к
 * Бабе Яге.
 */
export function departureAt(
	t: number,
	start: [number, number],
	facing: number,
	out: DeparturePose = { x: 0, z: 0, heading: 0 },
): DeparturePose {
	const d0 = distanceAlongPath(start[0], start[1]);
	const walked = Math.min(
		Math.max(t - DEPARTURE.stand - DEPARTURE.turn, 0) * DEPARTURE.speed,
		DEPARTURE.length,
	);

	// с места — плавно на ось тропы, дальше по ней
	const f = pathFrame(d0 + walked);
	const onPath = smooth(walked / DEPARTURE.merge);
	out.x = start[0] + (f.x - start[0]) * onPath;
	out.z = start[1] + (f.z - start[1]) * onPath;

	// разворот от Бабы Яги к тропе (по кратчайшей дуге)
	const away = awayHeading(d0 + walked);
	const turned = smooth((t - DEPARTURE.stand) / DEPARTURE.turn);
	let heading = facing + wrapAngle(away - facing) * turned;

	// на ходу изредка оглядывается: медленные повороты то вправо, то влево
	const look =
		Math.sin(walked * 0.33) * (0.55 + 0.45 * Math.sin(walked * 0.11 + 1.2));
	heading += look * 0.5 * smooth(walked / 2);
	out.heading = heading;
	return out;
}
