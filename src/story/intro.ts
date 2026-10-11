import { CatmullRomCurve3, Vector3 } from "three";

import { clamp, lerpAngle, smooth01 } from "../lib/math";
import { HOME } from "../scene/terrain";
import { onPath } from "./keyframes";

/**
 * Зачин: когда сайт только открылся, Василиса выходит из-за своей избы и
 * встаёт там, где стоит в прологе. Сценарий однократный — время `t` идёт с
 * загрузки сцены.
 */
export const INTRO = {
	/** Пауза перед выходом, с — пусть сначала проявится сцена. */
	delay: 0.8,
	/** Скорость шага, м/с. */
	speed: 1.1,
	/** За сколько секунд до остановки поворачивается лицом к лесу. */
	turn: 1.2,
};

/** Где она стоит в прологе (как atHome в keyframes.ts). */
const SPOT = onPath(51, 0, -2.6);

/** Из осей избы (x — вдоль фасада, z — от фасада к тропе) в мир. */
function fromHouse(lx: number, lz: number): Vector3 {
	const h = HOME.heading;
	return new Vector3(
		HOME.x + lx * Math.cos(h) + lz * Math.sin(h),
		0,
		HOME.z - lx * Math.sin(h) + lz * Math.cos(h),
	);
}

/** Маршрут: из-за дальнего угла избы — вдоль боковой стены — к месту у фасада. */
function introRoute(): CatmullRomCurve3 {
	const h = HOME.heading;
	const dx = SPOT[0] - HOME.x;
	const dz = SPOT[2] - HOME.z;
	// с той стороны избы, у которой она стоит (угол фасада)
	const side = -(Math.sign(dx * Math.cos(h) - dz * Math.sin(h)) || 1);
	return new CatmullRomCurve3(
		[
			fromHouse(side * 5, -3.5),
			fromHouse(side * 5.2, 0.5),
			fromHouse(side * 4.6, 3.6),
			new Vector3(SPOT[0], 0, SPOT[2]),
		],
		false,
		"centripetal",
	);
}

const route = introRoute();
const length = route.getLength();
/** Сколько длится выход, с (вместе с паузой). */
export const INTRO_TIME = INTRO.delay + length / INTRO.speed;

const tangent = new Vector3();
const point = new Vector3();

/**
 * Где Василиса в момент `t`, с; `facing` — её поворот в прологе (к лесу).
 */
export function introAt(
	t: number,
	facing: number,
	out = { x: 0, z: 0, heading: 0 },
) {
	const walked = clamp((t - INTRO.delay) * INTRO.speed, 0, length);
	const u = walked / length;
	route.getPointAt(u, point);
	route.getTangentAt(Math.min(u, 0.999), tangent);
	out.x = point.x;
	out.z = point.z;
	// идёт по ходу, у места — разворачивается лицом к лесу
	const left = (length - walked) / INTRO.speed;
	const turn = 1 - Math.min(left / INTRO.turn, 1);
	out.heading = lerpAngle(
		Math.atan2(tangent.x, tangent.z),
		facing,
		smooth01(turn),
	);
	return out;
}
