import { CatmullRomCurve3, Vector3 } from "three";
import { heightAt } from "../scene/terrain";
import {
	MUSIC_TRACKS,
	type MusicTrack,
	type SceneKeyframe,
	type VasilisaState,
} from "./keyframes";

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

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
	return t * t * (3 - 2 * t);
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
	};
	babaYaga: SceneKeyframe["babaYaga"];
}

export interface Timeline {
	length: number;
	sample: (progress: number, out?: TimelineSample) => TimelineSample;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
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
		vasilisa: {
			visible: false,
			x: 0,
			z: 0,
			heading: 0,
			pose: "stand",
			prop: null,
			elevation: 0,
		},
		babaYaga: null,
	};
}

/** Интерполяция угла по кратчайшей дуге. */
export function lerpAngle(a: number, b: number, t: number): number {
	const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
	return a + delta * t;
}

/**
 * Василиса между кадрами: если она есть в обоих — идёт из точки в точку,
 * иначе появляется/исчезает на середине перехода.
 */
function sampleVasilisa(
	a: VasilisaState | null,
	b: VasilisaState | null,
	t: number,
	out: TimelineSample["vasilisa"],
) {
	const nearest = t < 0.5 ? a : b;
	if (a && b) {
		out.visible = true;
		out.x = lerp(a.at[0], b.at[0], t);
		out.z = lerp(a.at[1], b.at[1], t);
		out.heading = lerpAngle(a.heading, b.heading, t);
		out.elevation = lerp(a.elevation ?? 0, b.elevation ?? 0, t);
	} else if (nearest) {
		out.visible = true;
		out.x = nearest.at[0];
		out.z = nearest.at[1];
		out.heading = nearest.heading;
		out.elevation = nearest.elevation ?? 0;
	} else {
		out.visible = false;
	}
	if (nearest) {
		out.pose = nearest.pose;
		out.prop = nearest.prop;
	}
}

const MIN_CAMERA_HEIGHT = 0.4;

/** Таймлайн сцены: камера по сплайнам Катмулла-Рома, остальное — линейно. */
export function createTimeline(keyframes: SceneKeyframe[]): Timeline {
	const positions = new CatmullRomCurve3(
		keyframes.map((k) => new Vector3(...k.camera.position)),
		false,
		"centripetal",
	);
	const targets = new CatmullRomCurve3(
		keyframes.map((k) => new Vector3(...k.camera.target)),
		false,
		"centripetal",
	);
	const hours = unwrapHours(keyframes.map((k) => k.timeOfDay));
	const last = keyframes.length - 1;

	return {
		length: keyframes.length,
		sample(progress, out = createSample()) {
			const p = Math.min(Math.max(progress, 0), last);
			const i = Math.min(Math.floor(p), last - 1);
			const t = p - i;
			const u = last === 0 ? 0 : p / last;
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
			out.fog = lerp(k0.fog ?? 1, k1.fog ?? 1, t);
			sampleVasilisa(k0.vasilisa, k1.vasilisa, t, out.vasilisa);
			out.babaYaga = t < 0.5 ? k0.babaYaga : k1.babaYaga;
			out.house = (t < 0.5 ? k0 : k1).house ?? false;
			return out;
		},
	};
}
