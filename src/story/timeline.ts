import {CatmullRomCurve3, Vector3} from "three";

import {
	clamp,
	clamp01,
	inverseLerp,
	lerp,
	lerpAngle,
	smoothstep,
} from "../lib/math";
import {heightAt, pathFrame} from "../scene/terrain";
import {
	MUSIC_TRACKS,
	type MusicTrack,
	type SceneKeyframe,
	type VasilisaState,
	type Vec3,
} from "./types";

/**
 * Прогресс истории по положению глав: дробный индекс 0..N-1.
 * Глава i «в фокусе», когда её середина совпадает с центром экрана.
 */
export function progressFromAnchors(anchors: number[], focus: number): number {
	if (anchors.length === 0) return 0;
	if (focus <= anchors[0]) return 0;
	const last = anchors.length - 1;
	if (focus >= anchors[last]) return last;
	let i = 0;
	while (focus >= anchors[i + 1]) i++;
	return i + (focus - anchors[i]) / (anchors[i + 1] - anchors[i]);
}

/**
 * Пока читатель в середине главы, сцена стоит на её кадре;
 * переход к следующему кадру — между главами.
 */
export function shapeProgress(progress: number, hold = 0.2): number {
	const i = Math.floor(progress);
	return i + smoothstep(hold, 1 - hold, progress - i);
}

/**
 * Разворачивает часы так, чтобы время шло только вперёд:
 * [22, 3, 12] → [22, 27, 36]. Цвета затем берутся по модулю 24.
 */
export function unwrapHours(hours: number[]): number[] {
	const result: number[] = [];
	for (const h of hours) {
		const prev = result[result.length - 1];
		if (prev === undefined) {
			result.push(h);
			continue;
		}
		const delta = (((h - prev) % 24) + 24) % 24;
		result.push(prev + delta);
	}
	return result;
}

export interface TimelineSample {
	position: Vector3;
	target: Vector3;
	fov: number;
	timeOfDay: number;
	wind: number;
	/** Громкость каждого музыкального трека 0..1 (кроссфейд между главами). */
	music: Record<MusicTrack, number>;
	/** Глаза черепов 0..1 */
	skulls: number;
	/** Волшебный свет куколки 0..1 */
	magic: number;
	/** Множитель плотности тумана */
	fog: number;
	/** Изба Василисы в сцене */
	house: boolean;
	/** Горит ли в избе Василисы свет */
	houseLit: boolean;
	/** Избушка Бабы Яги (с факелами и частоколом) в сцене */
	hut: boolean;
	vasilisa: {
		visible: boolean;
		/** Позиция на земле (y считает сцена по рельефу) */
		x: number;
		z: number;
		heading: number;
		pose: VasilisaState["pose"];
		prop: VasilisaState["prop"];
		/** Высота над землёй, м */
		elevation: number;
		/** Сколько ещё пройти по тропе, стоя на кадре (см. VasilisaState.onward). */
		onward: number;
		/** Где она на тропе, м от избушки (NaN — не на тропе). */
		path: number;
	};
	babaYaga: SceneKeyframe["babaYaga"];
}

export interface Timeline {
	length: number;
	sample: (progress: number, out?: TimelineSample) => TimelineSample;
}

export function createSample(): TimelineSample {
	return {
		position: new Vector3(),
		target: new Vector3(),
		fov: 50,
		timeOfDay: 0,
		wind: 0,
		music: Object.fromEntries(
			MUSIC_TRACKS.map((track) => [track, 0]),
		) as Record<MusicTrack, number>,
		skulls: 0,
		magic: 0,
		fog: 1,
		house: false,
		houseLit: true,
		hut: true,
		vasilisa: {
			visible: false,
			x: 0,
			z: 0,
			heading: 0,
			pose: "stand",
			prop: null,
			elevation: 0,
			onward: 0,
			path: Number.NaN,
		},
		babaYaga: null,
	};
}

/** Доля перехода `t`, пересчитанная на окно [from, to] (до — 0, после — 1). */
function within(t: number, from: number, to: number): number {
	if (to <= from) return t >= from ? 1 : 0;
	return clamp01(inverseLerp(from, to, t));
}

/** Сколько пройдено по тропе: с остановкой — дошла, постояла, пошла дальше. */
function pathDistance(
	from: number,
	to: number,
	t: number,
	stop: VasilisaState["stop"],
): number {
	if (!stop) return lerp(from, to, t);
	if (t < stop.from) return lerp(from, stop.at, smoothstep(0, stop.from, t));
	return lerp(stop.at, to, smoothstep(stop.to, 1, t));
}

/**
 * Василиса между кадрами: если она есть в обоих — идёт из точки в точку
 * (по тропе, если оба кадра на ней), иначе появляется/исчезает на середине
 * перехода.
 */
function sampleVasilisa(
	a: VasilisaState | null,
	b: VasilisaState | null,
	t: number,
	out: TimelineSample["vasilisa"],
) {
	const s = b ? within(t, ...b.window) : t;
	// стоит на кадре a (прогресс догоняет экспоненциально — не ровно 0)
	const rest = s < 0.03;
	const nearest = s < 0.5 ? a : b;
	if (a && b) {
		out.visible = true;
		if (a.path !== undefined && b.path !== undefined) {
			// с кадра, где она шла дальше (onward), — оттуда, куда дошла
			const from = rest ? a.path : a.path - a.onward;
			const d = pathDistance(from, b.path, s, b.stop);
			out.path = d;
			const side = lerp(a.side, b.side, s);
			const f = pathFrame(d);
			out.x = f.x - f.toHutZ * side;
			out.z = f.z + f.toHutX * side;
			// по пути — лицом вперёд по тропе
			out.heading =
				b.path < a.path
					? Math.atan2(f.toHutX, f.toHutZ)
					: lerpAngle(a.heading, b.heading, s);
		} else {
			out.path = Number.NaN;
			out.x = lerp(a.at[0], b.at[0], s);
			out.z = lerp(a.at[1], b.at[1], s);
			out.heading = lerpAngle(a.heading, b.heading, s);
		}
		out.elevation = lerp(a.elevation, b.elevation, s);
	} else if (nearest) {
		out.visible = true;
		out.path = nearest.path ?? Number.NaN;
		out.x = nearest.at[0];
		out.z = nearest.at[1];
		out.heading = nearest.heading;
		out.elevation = nearest.elevation;
	} else {
		out.visible = false;
	}
	if (nearest) {
		out.pose = nearest.pose;
		out.prop = nearest.prop;
	}
	// идёт дальше только стоя на кадре
	out.onward = rest && a ? a.onward : 0;
}

const MIN_CAMERA_HEIGHT = 0.4;
/** С какой доли перехода к главе с избушкой она уже в сцене. */
const HUT_APPEAR = 0.02;

/** Таймлайн сцены: камера по сплайнам Катмулла-Рома, остальное — линейно. */
export function createTimeline(keyframes: SceneKeyframe[]): Timeline {
	// узлы сплайна: кадры глав и промежуточные точки пролёта между ними
	const knots: {position: Vec3; target: Vec3}[] = [];
	const knotOf: number[] = [];
	for (const k of keyframes) {
		knots.push(...k.camera.via);
		knotOf.push(knots.length);
		knots.push(k.camera);
	}
	const positions = new CatmullRomCurve3(
		knots.map((k) => new Vector3(...k.position)),
		false,
		"centripetal",
	);
	const targets = new CatmullRomCurve3(
		knots.map((k) => new Vector3(...k.target)),
		false,
		"centripetal",
	);
	const hours = unwrapHours(keyframes.map((k) => k.timeOfDay));
	const last = keyframes.length - 1;

	return {
		length: keyframes.length,
		sample(progress, out = createSample()) {
			const p = clamp(progress, 0, last);
			const i = Math.min(Math.floor(p), last - 1);
			const t = p - i;
			const knot =
				last === 0 ? 0 : lerp(knotOf[i], knotOf[i + 1] ?? knotOf[i], t);
			const u = knots.length > 1 ? knot / (knots.length - 1) : 0;
			positions.getPoint(u, out.position);
			// сплайн между низкими кадрами может нырнуть под землю — держим камеру над рельефом
			out.position.y = Math.max(
				out.position.y,
				heightAt(out.position.x, out.position.z) + MIN_CAMERA_HEIGHT,
			);
			targets.getPoint(u, out.target);
			out.fov = lerp(
				keyframes[i].camera.fov,
				keyframes[i + 1]?.camera.fov ?? keyframes[i].camera.fov,
				t,
			);
			out.timeOfDay = lerp(hours[i], hours[i + 1] ?? hours[i], t) % 24;
			out.wind = lerp(
				keyframes[i].wind,
				keyframes[i + 1]?.wind ?? keyframes[i].wind,
				t,
			);
			const from = keyframes[i].music;
			const to = keyframes[i + 1]?.music ?? from;
			for (const track of MUSIC_TRACKS) {
				const a = from.track === track ? from.volume : 0;
				const b = to.track === track ? to.volume : 0;
				out.music[track] = lerp(a, b, t);
			}
			const k0 = keyframes[i];
			const k1 = keyframes[i + 1] ?? k0;
			out.skulls = lerp(k0.skulls, k1.skulls, t);
			out.magic = lerp(k0.magic, k1.magic, t);
			out.fog = lerp(k0.fog, k1.fog, t);
			sampleVasilisa(k0.vasilisa, k1.vasilisa, t, out.vasilisa);
			out.babaYaga = t < 0.5 ? k0.babaYaga : k1.babaYaga;
			out.house = (t < 0.5 ? k0 : k1).house;
			// погас — так на весь переход: окна не вспыхивают, пока темнеет
			out.houseLit = k0.houseLit && (t === 0 || k1.houseLit);
			// избушка появляется сразу, как только начался переход к главе с ней
			out.hut = k0.hut || (k1.hut && t > HUT_APPEAR);
			return out;
		},
	};
}
