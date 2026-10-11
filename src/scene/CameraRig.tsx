import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type PerspectiveCamera, Vector3 } from "three";
import { debugFlags } from "../debugFlags";
import { useSceneStore } from "../state/sceneStore";
import { useStoryStore } from "../state/storyStore";
import { currentSample, sceneProgress } from "../story/currentSample";
import {
	creditsCamera,
	HOMECOMING,
	homecomingCamera,
	homecomingClock,
	homecomingNight,
} from "../story/homecoming";
import { KEYFRAMES, TITLE_SHIFT } from "../story/keyframes";
import {
	delayedTimeProgress,
	easeScene,
	stepLight,
	stepScene,
} from "../story/lightDelay";
import { riderStarts } from "../story/riderClock";
import { createSample, createTimeline, shapeProgress } from "../story/timeline";
import {
	drift,
	PARALLAX_LOOK,
	PARALLAX_SHIFT,
	pointer,
	swayPointer,
} from "./pointerParallax";
import { heightAt } from "./terrain";

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

const UP = new Vector3(0, 1, 0);
const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();
const lookAt = new Vector3();
const timeSample = createSample();
const epiloguePosition = new Vector3();
const epilogueTarget = new Vector3();
/** Зачин: на сколько метров дальше (по той же линии взгляда) начинает камера. */
const INTRO_BACK = 7;
/** За сколько секунд подлетает; если листнули раньше — доводится за INTRO_SKIP. */
const INTRO_FLY = 6;
const INTRO_SKIP = 0.6;
const back = new Vector3();
/** За сколько секунд камера на титрах набирает высоту и как быстро возвращается. */
const CREDITS_RISE = 25;
const CREDITS_RETURN = 2;
const creditsPosition = new Vector3();
const creditsTarget = new Vector3();
/** Как быстро камера переходит на съёмку эпилога и обратно. */
const EPILOGUE_BLEND = 1.2;

// ?time=HH фиксирует время суток (для отладки освещения)
const timeLocked =
	typeof window !== "undefined" &&
	new URLSearchParams(window.location.search).has("time");

/**
 * Ведёт камеру, время суток и ветер по таймлайну истории.
 * Прогресс сглаживается, чтобы рывки колеса мыши не превращались в рывки камеры.
 */
export function CameraRig() {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const timeline = useMemo(() => createTimeline(KEYFRAMES), []);
	const sample = currentSample;
	const parallax = useRef({ x: 0, y: 0 });
	const lightProgress = useRef<number | null>(null);
	/** Прогресс сцены до сглаживания перехода (см. easeScene). */
	const staged = useRef<number | null>(null);
	/** Доля съёмки эпилога (0 — камера по таймлайну, 1 — по homecoming.ts). */
	const epilogue = useRef(0);
	/** Сглаженные доли «на титуле» и «ушли к титрам» (см. storyStore). */
	const edges = useRef<{ title: number } | null>(null);
	/** Подъём камеры на титрах: 0 — там, где кончился эпилог, 1 — высоко. */
	const rise = useRef(0);
	/** Сколько осталось подлёта при открытии сайта: 1 — в начале, 0 — на месте. */
	const intro = useRef<number | null>(null);

	useFrame(({ clock }, delta) => {
		const progress = useStoryStore.getState().progress;
		const target = shapeProgress(progress);
		// сцена (камера, герои): экспоненциально догоняет прокрутку, но
		// медленные переходы — не быстрее заданного
		const from = debugFlags.instant ? target : (staged.current ?? target);
		staged.current = debugFlags.instant
			? target
			: stepScene(from, target, delta, DAMPING);
		sceneProgress.value = easeScene(staged.current);

		timeline.sample(sceneProgress.value, sample);
		// свет меняется не сразу, а после того как проскачет всадник
		// время суток стоит, пока читаешь главу, и меняется ближе к границе
		// между главами (иначе при чтении конца главы уже начинало темнеть)
		const timeTarget = delayedTimeProgress(
			shapeProgress(progress, LIGHT_HOLD),
			clock.elapsedTime,
			riderStarts,
		);
		// время суток догоняет плавно: никаких скачков света при быстрой прокрутке
		const lp = lightProgress.current ?? timeTarget;
		lightProgress.current = debugFlags.instant
			? timeTarget
			: stepLight(lp, timeTarget, delta, LIGHT_DAMPING);
		if (Math.abs(lightProgress.current - sceneProgress.value) > 1e-4) {
			sample.timeOfDay = timeline.sample(
				lightProgress.current,
				timeSample,
			).timeOfDay;
		}

		// эпилог снимается по своим часам: следом за Василисой, потом с высоты
		const home = homecomingClock;
		const filming = home.start >= 0 && home.route !== null;
		if (filming && home.route) {
			const t = clock.elapsedTime - home.start;
			homecomingCamera(home.route, t, epiloguePosition, epilogueTarget);
			// пока камера летит к избушке — вечер сменяется ночью
			const night = homecomingNight(home.route, t);
			sample.timeOfDay += (HOMECOMING.nightHour - sample.timeOfDay) * night;
		}
		epilogue.current +=
			((filming ? 1 : 0) - epilogue.current) *
			(1 - Math.exp(-EPILOGUE_BLEND * Math.min(delta, 0.1)));
		if (debugFlags.instant) epilogue.current = filming ? 1 : 0;
		if (epilogue.current > 1e-3) {
			sample.position.lerp(epiloguePosition, epilogue.current);
			sample.target.lerp(epilogueTarget, epilogue.current);
		}

		// титул — камера дальше от Василисы, к прологу подлетает ближе;
		// титры — взлетает высоко над избушкой (даже если эпилог не досмотрен)
		const story = useStoryStore.getState();
		const e = edges.current ?? { title: story.title };
		edges.current = e;
		const ke = debugFlags.instant
			? 1
			: 1 - Math.exp(-DAMPING * Math.min(delta, 0.1));
		e.title += (story.title - e.title) * ke;
		if (e.title > 1e-3) {
			const k = e.title * e.title * (3 - 2 * e.title);
			sample.position.x += TITLE_SHIFT[0] * k;
			sample.position.y += TITLE_SHIFT[1] * k;
			sample.position.z += TITLE_SHIFT[2] * k;
		}
		// на титрах — медленно, за CREDITS_RISE секунд, с того места, где
		// закончился эпилог; ушли с титров — быстро обратно
		const onCredits = story.edge === "credits";
		rise.current = Math.min(
			Math.max(
				rise.current +
					(onCredits ? 1 / CREDITS_RISE : -1 / CREDITS_RETURN) *
						Math.min(delta, 0.1),
				0,
			),
			1,
		);
		if (debugFlags.instant) rise.current = onCredits ? 1 : 0;
		if (rise.current > 1e-4) {
			creditsCamera(creditsPosition, creditsTarget);
			const r = rise.current;
			const k = r * r * (3 - 2 * r);
			sample.position.lerp(creditsPosition, k);
			sample.target.lerp(creditsTarget, Math.min(k * 2, 1));
		}

		// при открытии на прологе камера подлетает к дому издалека — по той же
		// линии взгляда (угол обзора тот же)
		if (intro.current === null)
			intro.current = sceneProgress.value < 0.02 && !debugFlags.instant ? 1 : 0;
		if (intro.current > 0) {
			const atStart = sceneProgress.value < 0.02;
			intro.current = Math.max(
				intro.current -
					Math.min(delta, 0.1) / (atStart ? INTRO_FLY : INTRO_SKIP),
				0,
			);
			const k = intro.current;
			// плавно тормозит у цели
			const offset = INTRO_BACK * k * k * (3 - 2 * k);
			back.subVectors(sample.position, sample.target).normalize();
			sample.position.addScaledVector(back, offset);
		}

		// без мыши (телефон, планшет) — медленное покачивание вместо неё,
		// с мышью — малое покачивание поверх неё
		swayPointer(clock.elapsedTime);
		// лёгкий параллакс от мыши: камера сдвигается за курсором и чуть
		// доворачивает взгляд; амплитуда — доля расстояния до цели
		const p = parallax.current;
		const k = 1 - Math.exp(-PARALLAX_DAMPING * Math.min(delta, 0.1));
		p.x += (pointer.x + drift.x - p.x) * k;
		p.y += (pointer.y + drift.y - p.y) * k;
		forward.subVectors(sample.target, sample.position);
		const amplitude = forward.length() * PARALLAX_SHIFT;
		forward.normalize();
		right.crossVectors(forward, UP).normalize();
		up.crossVectors(right, forward).normalize();
		camera.position
			.copy(sample.position)
			.addScaledVector(right, p.x * amplitude)
			.addScaledVector(up, -p.y * amplitude * 0.6);
		camera.position.y = Math.max(
			camera.position.y,
			heightAt(camera.position.x, camera.position.z) + MIN_HEIGHT,
		);
		lookAt
			.copy(sample.target)
			.addScaledVector(right, p.x * amplitude * PARALLAX_LOOK)
			.addScaledVector(up, -p.y * amplitude * PARALLAX_LOOK * 0.6);
		camera.lookAt(lookAt);
		if (Math.abs(camera.fov - sample.fov) > 1e-3) {
			camera.fov = sample.fov;
			camera.updateProjectionMatrix();
		}

		const scene = useSceneStore.getState();
		if (!timeLocked && Math.abs(scene.timeOfDay - sample.timeOfDay) > 1e-4) {
			scene.setTimeOfDay(sample.timeOfDay);
		}
		if (Math.abs(scene.wind - sample.wind) > 1e-4) scene.setWind(sample.wind);
	});

	return null;
}
