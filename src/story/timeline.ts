import { CatmullRomCurve3, Vector3 } from "three";
import type { SceneKeyframe } from "./keyframes";

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
	};
}

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
			return out;
		},
	};
}
