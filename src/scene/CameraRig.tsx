import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type PerspectiveCamera, Vector3 } from "three";
import { debugFlags } from "../debugFlags";
import { useSceneStore } from "../state/sceneStore";
import { useStoryStore } from "../state/storyStore";
import { currentSample } from "../story/currentSample";
import { KEYFRAMES } from "../story/keyframes";
import { delayedTimeProgress } from "../story/lightDelay";
import { riderStarts } from "../story/riderClock";
import { createSample, createTimeline, shapeProgress } from "../story/timeline";
import { PARALLAX_LOOK, PARALLAX_SHIFT, pointer } from "./pointerParallax";
import { heightAt } from "./terrain";

/** Скорость догоняния прокрутки: больше — резче. */
const DAMPING = 2.5;
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
	const smoothed = useRef<number | null>(null);
	const parallax = useRef({ x: 0, y: 0 });
	const lightProgress = useRef<number | null>(null);

	useFrame(({ clock }, delta) => {
		const target = shapeProgress(useStoryStore.getState().progress);
		// первый кадр — сразу на место, дальше — экспоненциальное сглаживание
		const current = debugFlags.instant ? target : (smoothed.current ?? target);
		smoothed.current =
			current +
			(target - current) * (1 - Math.exp(-DAMPING * Math.min(delta, 0.1)));

		timeline.sample(smoothed.current, sample);
		// свет меняется не сразу, а после того как проскачет всадник
		const timeTarget = delayedTimeProgress(
			smoothed.current,
			clock.elapsedTime,
			riderStarts,
		);
		// время суток догоняет плавно: никаких скачков света при быстрой прокрутке
		const lp = lightProgress.current ?? timeTarget;
		lightProgress.current = debugFlags.instant
			? timeTarget
			: lp +
				(timeTarget - lp) *
					(1 - Math.exp(-LIGHT_DAMPING * Math.min(delta, 0.1)));
		if (Math.abs(lightProgress.current - smoothed.current) > 1e-4) {
			sample.timeOfDay = timeline.sample(
				lightProgress.current,
				timeSample,
			).timeOfDay;
		}

		// лёгкий параллакс от мыши: камера сдвигается за курсором и чуть
		// доворачивает взгляд; амплитуда — доля расстояния до цели
		const p = parallax.current;
		const k = 1 - Math.exp(-PARALLAX_DAMPING * Math.min(delta, 0.1));
		p.x += (pointer.x - p.x) * k;
		p.y += (pointer.y - p.y) * k;
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
