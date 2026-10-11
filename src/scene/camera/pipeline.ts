import {Vector3} from "three";

import {damp, dampFactor, ramp} from "../../lib/damp";
import {smooth01} from "../../lib/math";
import {sceneProgress} from "../../story/currentSample";
import {
	creditsCamera,
	HOMECOMING,
	homecomingCamera,
	homecomingClock,
	homecomingNight,
} from "../../story/homecoming";
import {
	delayedTimeProgress,
	easeScene,
	stepLight,
	stepScene,
} from "../../story/lightDelay";
import type {ReadingPosition} from "../../story/readingPosition";
import {riderStarts} from "../../story/riderClock";
import {TITLE_SHIFT} from "../../story/scenes";
import {
	createSample,
	shapeProgress,
	type Timeline,
	type TimelineSample,
} from "../../story/timeline";
import {heightAt} from "../terrain";

/** Скорость догоняния прокрутки: больше — резче. */
const DAMPING = 2.5;
/** Какую долю пути от главы до главы держится её время суток (с каждой стороны). */
const LIGHT_HOLD = 0.4;
/** Скорость, с которой время суток догоняет прокрутку. */
const LIGHT_DAMPING = 1.6;
/** Скорость, с которой камера следует за мышью. */
const PARALLAX_DAMPING = 3;
/** Минимальная высота камеры над землёй, м. */
const MIN_HEIGHT = 0.35;
/** Как быстро камера переходит с титула к прологу (меньше — плавнее). */
const TITLE_DAMPING = 0.9;
/** Зачин: на сколько метров дальше (по той же линии взгляда) начинает камера. */
const INTRO_BACK = 7;
/** За сколько секунд подлетает; если листнули раньше — доводится за INTRO_SKIP. */
const INTRO_FLY = 6;
const INTRO_SKIP = 0.6;
/** За сколько секунд камера на титрах набирает высоту и как быстро возвращается. */
const CREDITS_RISE = 25;
const CREDITS_RETURN = 2;
/** Как быстро камера переходит на съёмку эпилога и обратно. */
const EPILOGUE_BLEND = 1.2;
/** Сцена «в начале», если её прогресс меньше этого (подлёт при открытии). */
const AT_START = 0.02;

/** Что слои знают о кадре. */
export interface CameraContext {
	/** Секунд с прошлого кадра. */
	delta: number;
	/** Часы сцены, с. */
	now: number;
	/** Где читатель (storyStore). */
	reading: ReadingPosition;
	/** Сразу в кадр главы, без сглаживания (?instant — снимки, тесты). */
	instant: boolean;
	/** Указатель мыши (или покачивание без неё): −1..1 по осям. */
	pointer: {x: number; y: number};
}

/** Куда смотрит камера после всех слоёв. */
export interface CameraOutput {
	position: Vector3;
	lookAt: Vector3;
	fov: number;
}

/** Слой: дорабатывает кадр (`sample`) — у каждого своё сглаженное состояние. */
type Layer = (sample: TimelineSample, ctx: CameraContext) => void;

/** Параллакс: сдвиг камеры (доля расстояния до цели) и доворот взгляда. */
export interface ParallaxSettings {
	shift: number;
	look: number;
}

/**
 * Камера, время суток и ветер по таймлайну истории — конвейер слоёв:
 * таймлайн → свет → эпилог → титул → титры → подлёт → параллакс и высота.
 * Порядок слоёв — данные (`layers`), каждый слой со своим сглаживанием.
 */
export function createCameraPipeline(
	timeline: Timeline,
	parallax: ParallaxSettings,
) {
	const timeSample = createSample();

	/** Таймлайн: сцена догоняет прокрутку, переходы — не быстрее заданного. */
	const timelineLayer = (() => {
		let staged: number | null = null;
		return ((sample, {reading, delta, instant}) => {
			const target = shapeProgress(reading.progress);
			staged = instant
				? target
				: stepScene(staged ?? target, target, delta, DAMPING);
			sceneProgress.value = easeScene(staged);
			timeline.sample(sceneProgress.value, sample);
		}) satisfies Layer;
	})();

	/**
	 * Время суток: стоит, пока читаешь главу, меняется ближе к границе между
	 * главами, после того как проскачет всадник, — и догоняет плавно.
	 */
	const lightLayer = (() => {
		let light: number | null = null;
		return ((sample, {reading, delta, now, instant}) => {
			const target = delayedTimeProgress(
				shapeProgress(reading.progress, LIGHT_HOLD),
				now,
				riderStarts,
			);
			light = instant
				? target
				: stepLight(light ?? target, target, delta, LIGHT_DAMPING);
			if (Math.abs(light - sceneProgress.value) > 1e-4) {
				sample.timeOfDay = timeline.sample(light, timeSample).timeOfDay;
			}
		}) satisfies Layer;
	})();

	/** Эпилог снимается по своим часам: следом за Василисой, потом с высоты. */
	const epilogueLayer = (() => {
		let blend = 0;
		const position = new Vector3();
		const target = new Vector3();
		return ((sample, {delta, now, instant}) => {
			const {start, route} = homecomingClock;
			const filming = start >= 0 && route !== null;
			if (filming) {
				const t = now - start;
				homecomingCamera(route, t, position, target);
				// пока камера летит к избушке — вечер сменяется ночью
				const night = homecomingNight(route, t);
				sample.timeOfDay += (HOMECOMING.nightHour - sample.timeOfDay) * night;
			}
			blend = instant
				? Number(filming)
				: damp(blend, filming ? 1 : 0, EPILOGUE_BLEND, delta);
			if (blend > 1e-3) {
				sample.position.lerp(position, blend);
				sample.target.lerp(target, blend);
			}
		}) satisfies Layer;
	})();

	/** Титул: камера дальше от Василисы, к прологу — не спеша подлетает. */
	const titleLayer = (() => {
		let title: number | null = null;
		return ((sample, {reading, delta, instant}) => {
			title = instant
				? reading.title
				: damp(title ?? reading.title, reading.title, TITLE_DAMPING, delta);
			if (title > 1e-3) {
				const k = smooth01(title);
				sample.position.x += TITLE_SHIFT[0] * k;
				sample.position.y += TITLE_SHIFT[1] * k;
				sample.position.z += TITLE_SHIFT[2] * k;
			}
		}) satisfies Layer;
	})();

	/**
	 * Титры: медленно, за CREDITS_RISE секунд, взлетает высоко над избушкой —
	 * с того места, где закончился эпилог; ушли с титров — быстро обратно.
	 */
	const creditsLayer = (() => {
		let rise = 0;
		const position = new Vector3();
		const target = new Vector3();
		return ((sample, {reading, delta, instant}) => {
			const onCredits = reading.edge === "credits";
			rise = instant
				? Number(onCredits)
				: ramp(rise, onCredits, CREDITS_RISE, CREDITS_RETURN, delta);
			if (rise > 1e-4) {
				creditsCamera(position, target);
				const k = smooth01(rise);
				sample.position.lerp(position, k);
				sample.target.lerp(target, Math.min(k * 2, 1));
			}
		}) satisfies Layer;
	})();

	/**
	 * Подлёт при открытии на прологе: камера начинает издалека — по той же
	 * линии взгляда (угол обзора тот же) — и плавно тормозит у цели.
	 */
	const introLayer = (() => {
		let intro: number | null = null;
		const back = new Vector3();
		return ((sample, {delta, instant}) => {
			intro ??= sceneProgress.value < AT_START && !instant ? 1 : 0;
			if (intro <= 0) return;
			const fly = sceneProgress.value < AT_START ? INTRO_FLY : INTRO_SKIP;
			intro = ramp(intro, false, fly, fly, delta);
			back.subVectors(sample.position, sample.target).normalize();
			sample.position.addScaledVector(back, INTRO_BACK * smooth01(intro));
		}) satisfies Layer;
	})();

	const layers: Layer[] = [
		timelineLayer,
		lightLayer,
		epilogueLayer,
		titleLayer,
		creditsLayer,
		introLayer,
	];

	/**
	 * Параллакс и высота: камера сдвигается за указателем и чуть доворачивает
	 * взгляд (амплитуда — доля расстояния до цели), но не уходит под землю.
	 */
	const place = (() => {
		const smoothed = {x: 0, y: 0};
		const UP = new Vector3(0, 1, 0);
		const forward = new Vector3();
		const right = new Vector3();
		const up = new Vector3();
		return (sample: TimelineSample, ctx: CameraContext, out: CameraOutput) => {
			const k = dampFactor(PARALLAX_DAMPING, ctx.delta);
			smoothed.x += (ctx.pointer.x - smoothed.x) * k;
			smoothed.y += (ctx.pointer.y - smoothed.y) * k;
			forward.subVectors(sample.target, sample.position);
			const amplitude = forward.length() * parallax.shift;
			forward.normalize();
			right.crossVectors(forward, UP).normalize();
			up.crossVectors(right, forward).normalize();
			out.position
				.copy(sample.position)
				.addScaledVector(right, smoothed.x * amplitude)
				.addScaledVector(up, -smoothed.y * amplitude * 0.6);
			out.position.y = Math.max(
				out.position.y,
				heightAt(out.position.x, out.position.z) + MIN_HEIGHT,
			);
			out.lookAt
				.copy(sample.target)
				.addScaledVector(right, smoothed.x * amplitude * parallax.look)
				.addScaledVector(up, -smoothed.y * amplitude * parallax.look * 0.6);
			out.fov = sample.fov;
		};
	})();

	return {
		/** Один кадр: дорабатывает `sample` слоями и ставит камеру в `out`. */
		step(sample: TimelineSample, ctx: CameraContext, out: CameraOutput) {
			for (const layer of layers) layer(sample, ctx);
			place(sample, ctx, out);
		},
	};
}
