import { CatmullRomCurve3, Vector3 } from "three";
import { clamp, lerpAngle, smooth01 as smooth } from "../lib/math";
import { HOME, heightAt, pathFrame } from "../scene/terrain";
import { distanceAlongPath } from "./departure";
import { onPath } from "./keyframes";

/** Где Василиса стоит у своей избы — как в прологе (atHome в keyframes.ts). */
const HOME_SPOT = onPath(51, 0, -2.6);

/**
 * «Эпилог»: Василиса с черепом идёт дальше по тропе — с того места, где её
 * застала смена главы, — доходит до своей избы и обходит её кругом. Камера
 * сначала идёт следом, потом плавно поднимается и с высоты птичьего полёта
 * разворачивается на избушку на курьих ножках. Сценарий однократный — время
 * `t` идёт с входа в главу.
 */
export const HOMECOMING = {
	/** Скорость шага, м/с. */
	speed: 1.3,
	/** Где (м от избушки по тропе) сворачивает с тропы к дому. */
	leavePath: 43,
	/**
	 * Полуоси обхода вокруг сруба (модель 7.1 × 8.6 м, см. House.tsx): по
	 * ширине и по глубине дома, с запасом на углах.
	 */
	aroundX: 5.8,
	aroundZ: 6.5,
	/** Сколько секунд после начала обхода камера ещё идёт следом. */
	riseDelay: 3,
	/** За сколько секунд камера поднимается и разворачивается на избушку. */
	rise: 17,
	/**
	 * Камера в конце: метров от избушки по тропе, вбок от тропы (ракурс чуть
	 * сбоку от избушки) и над землёй.
	 */
	finalDistance: 18,
	finalSide: 8.5,
	finalHeight: 42,
	/** Пока камера летит к избушке, вечер сменяется ночью: до этого часа. */
	nightHour: 23,
	/** Куда в конце смотрит камера — на избушку. */
	finalTarget: [0, 3, 0] as [number, number, number],
	/**
	 * Титры: камера продолжает ту же линию, что в конце эпилога (тот же
	 * поворот и угол — кадр не разворачивается), только выше и чуть дальше:
	 * высота над землёй и множитель отступа по горизонтали.
	 */
	creditsHeight: 59,
	creditsAcross: 1.3,
	/**
	 * Взгляд — не в избушку, а на эту долю пути от неё к точке под камерой:
	 * избушка встаёт ближе к верху кадра (на телефоне низ закрыт текстом).
	 */
	creditsLookAhead: 0.25,
};

/**
 * Общие часы эпилога: их заводит Василиса (знает, где стоит в момент входа в
 * главу), по ним же ведёт камеру CameraRig. start < 0 — эпилог не идёт.
 */
export const homecomingClock: { start: number; route: HomecomingRoute | null } =
	{ start: -1, route: null };

/** Точек на обходе вокруг дома. */
const AROUND_POINTS = 28;
/** Насколько квадратный обход: 2 — эллипс, больше — ближе к прямоугольнику. */
const AROUND_SQUARENESS = 2.3;
/** С какого угла (рад) до точки напротив тропы начинается обход. */
const AROUND_LEAD = 0.3;
/** Насколько (рад) раньше точки напротив тропы обход сворачивает к крыльцу — без рывка. */
const END_SHORT = 0.9;

export interface HomecomingRoute {
	curve: CatmullRomCurve3;
	length: number;
	/** Сколько метров до начала обхода дома. */
	aroundStart: number;
	/** Поворот в момент старта — с него плавно на направление шага. */
	startHeading: number;
	/** Где на тропе (м от избушки) она была в момент старта. */
	startDistance: number;
}

/** Точка обхода: суперэллипс вокруг дома в его осях (θ — угол по кругу). */
function aroundPoint(theta: number): Vector3 {
	const p = 2 / AROUND_SQUARENESS;
	const c = Math.cos(theta);
	const s = Math.sin(theta);
	const lx = HOMECOMING.aroundX * Math.sign(c) * Math.abs(c) ** p;
	const lz = HOMECOMING.aroundZ * Math.sign(s) * Math.abs(s) ** p;
	// оси дома: поворот на HOME.heading вокруг Y
	const h = HOME.heading;
	return new Vector3(
		HOME.x + lx * Math.cos(h) + lz * Math.sin(h),
		0,
		HOME.z - lx * Math.sin(h) + lz * Math.cos(h),
	);
}

/** Угол на обходе, ближайший к точке [x, z] (направление из центра дома). */
function aroundAngle(x: number, z: number): number {
	const h = HOME.heading;
	const dx = x - HOME.x;
	const dz = z - HOME.z;
	const lx = dx * Math.cos(h) - dz * Math.sin(h);
	const lz = dx * Math.sin(h) + dz * Math.cos(h);
	return Math.atan2(lz / HOMECOMING.aroundZ, lx / HOMECOMING.aroundX);
}

/** Маршрут от точки старта: по тропе к дому и кругом вокруг него. */
export function homecomingRoute(
	start: [number, number],
	startHeading: number,
): HomecomingRoute {
	const points = [new Vector3(start[0], 0, start[1])];
	const startDistance = distanceAlongPath(start[0], start[1]);
	const from = startDistance + 3;
	for (let d = from; d < HOMECOMING.leavePath; d += 4) {
		const f = pathFrame(d);
		points.push(new Vector3(f.x, 0, f.z));
	}
	const exit = pathFrame(HOMECOMING.leavePath);
	// уже прошла поворот к дому — сразу к обходу, не возвращаясь назад
	if (startDistance < HOMECOMING.leavePath - 2)
		points.push(new Vector3(exit.x, 0, exit.z));
	const aroundIndex = points.length;
	// обход — без резкого поворота: входит по касательной к направлению
	// шага, чуть раньше точки, что напротив тропы
	const front = pathFrame(52);
	const thetaFront = aroundAngle(front.x, front.z);
	const a = aroundPoint(thetaFront);
	const b = aroundPoint(thetaFront + 0.01);
	const along = (b.x - a.x) * -exit.toHutX + (b.z - a.z) * -exit.toHutZ;
	const dir = along >= 0 ? 1 : -1;
	const theta0 = thetaFront - dir * AROUND_LEAD;
	// почти полный круг, а оттуда плавно к крыльцу:
	// встаёт там же, где стоит в прологе, — назад к ней идти не придётся
	const sweep = Math.PI * 2 + AROUND_LEAD - END_SHORT;
	const steps = Math.round((AROUND_POINTS * sweep) / (Math.PI * 2));
	for (let i = 0; i <= steps; i++) {
		points.push(aroundPoint(theta0 + dir * (i / steps) * sweep));
	}
	const [hx, , hz] = HOME_SPOT;
	points.push(new Vector3(hx, 0, hz));

	const curve = new CatmullRomCurve3(points, false, "centripetal");
	const divisions = 600;
	const lengths = curve.getLengths(divisions);
	const length = lengths[divisions];
	const aroundT = aroundIndex / (points.length - 1);
	return {
		curve,
		length,
		aroundStart: lengths[Math.round(aroundT * divisions)],
		startHeading,
		startDistance,
	};
}

export interface HomecomingPose {
	x: number;
	z: number;
	heading: number;
	/** Пройдено, м. */
	walked: number;
}

const point = new Vector3();
const tangent = new Vector3();

/** Где Василиса в момент `t`, с. */
export function homecomingAt(
	route: HomecomingRoute,
	t: number,
	out: HomecomingPose = { x: 0, z: 0, heading: 0, walked: 0 },
): HomecomingPose {
	const walked = clamp(t * HOMECOMING.speed, 0, route.length);
	const u = walked / route.length;
	route.curve.getPointAt(u, point);
	route.curve.getTangentAt(Math.min(u, 0.999), tangent);
	out.x = point.x;
	out.z = point.z;
	out.walked = walked;
	let heading = Math.atan2(tangent.x, tangent.z);
	// с прежнего поворота — плавно на направление шага
	heading = lerpAngle(route.startHeading, heading, smooth(t / 1.2));
	// обошла дом — поворачивается к нему лицом
	const done = Math.max(t - route.length / HOMECOMING.speed, 0);
	if (done > 0) {
		const toHouse = Math.atan2(HOME.x - out.x, HOME.z - out.z);
		heading = lerpAngle(heading, toHouse, smooth(done / 1.5));
	}
	out.heading = heading;
	return out;
}

/** Насколько опустилась ночь (0..1): вместе с полётом камеры к избушке. */
export function homecomingNight(route: HomecomingRoute, t: number): number {
	const aroundTime = route.aroundStart / HOMECOMING.speed;
	return smooth((t - aroundTime - HOMECOMING.riseDelay) / HOMECOMING.rise);
}

const follow = new Vector3();
const her = new Vector3();
const final = new Vector3();
const finalTarget = new Vector3();
const herPose: HomecomingPose = { x: 0, z: 0, heading: 0, walked: 0 };

/**
 * Камера в момент `t`: идёт следом за Василисой (сзади-сбоку), с начала
 * обхода дома останавливается, затем поднимается и разворачивается на избушку.
 */
export function homecomingCamera(
	route: HomecomingRoute,
	t: number,
	position: Vector3,
	target: Vector3,
): void {
	const pose = homecomingAt(route, t, herPose);
	her.set(pose.x, heightAt(pose.x, pose.z) + 1.2, pose.z);

	// следом: по тропе в нескольких шагах позади; у поворота к дому —
	// останавливается и дальше только провожает её взглядом
	const along =
		Math.min(route.startDistance + pose.walked, HOMECOMING.leavePath - 1) - 5.5;
	const p = pathFrame(along);
	// чуть вправо от тропы (если смотреть от избушки) — дом не загорожен
	follow.set(p.x + p.toHutZ * 1.3, 0, p.z - p.toHutX * 1.3);
	follow.y = heightAt(follow.x, follow.z) + 2.4;

	// подъём: сначала вверх, потом — над лесом к избушке
	const aroundTime = route.aroundStart / HOMECOMING.speed;
	const r = (t - aroundTime - HOMECOMING.riseDelay) / HOMECOMING.rise;
	const up = smooth(r * 1.8);
	const across = smooth(r);
	const f = pathFrame(HOMECOMING.finalDistance);
	const fx = f.x + f.toHutZ * HOMECOMING.finalSide;
	const fz = f.z - f.toHutX * HOMECOMING.finalSide;
	final.set(fx, heightAt(fx, fz) + HOMECOMING.finalHeight, fz);
	position.set(
		follow.x + (final.x - follow.x) * across,
		follow.y + (final.y - follow.y) * up,
		follow.z + (final.z - follow.z) * across,
	);
	// взгляд — с Василисы на избушку
	finalTarget.set(...HOMECOMING.finalTarget);
	target.lerpVectors(her, finalTarget, smooth(r * 1.25 - 0.1));
}

/** Камера на титрах: высоко над избушкой (см. HOMECOMING.creditsHeight). */
export function creditsCamera(position: Vector3, target: Vector3): void {
	const f = pathFrame(HOMECOMING.finalDistance);
	const fx = f.x + f.toHutZ * HOMECOMING.finalSide;
	const fz = f.z - f.toHutX * HOMECOMING.finalSide;
	const k = HOMECOMING.creditsAcross;
	position.set(fx * k, heightAt(0, 0) + HOMECOMING.creditsHeight, fz * k);
	const ahead = HOMECOMING.creditsLookAhead;
	const [hx, hy, hz] = HOMECOMING.finalTarget;
	target.set(
		hx + (position.x - hx) * ahead,
		hy,
		hz + (position.z - hz) * ahead,
	);
}
