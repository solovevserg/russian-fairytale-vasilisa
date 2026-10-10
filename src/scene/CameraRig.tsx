import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { useSceneStore } from "../state/sceneStore";
import { useStoryStore } from "../state/storyStore";
import { KEYFRAMES } from "../story/keyframes";
import { createSample, createTimeline, shapeProgress } from "../story/timeline";

/** Скорость догоняния прокрутки: больше — резче. */
const DAMPING = 2.5;

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
	const sample = useMemo(createSample, []);
	const smoothed = useRef<number | null>(null);

	useFrame((_, delta) => {
		const target = shapeProgress(useStoryStore.getState().progress);
		// первый кадр — сразу на место, дальше — экспоненциальное сглаживание
		const current = smoothed.current ?? target;
		smoothed.current =
			current +
			(target - current) * (1 - Math.exp(-DAMPING * Math.min(delta, 0.1)));

		timeline.sample(smoothed.current, sample);
		camera.position.copy(sample.position);
		camera.lookAt(sample.target);
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
