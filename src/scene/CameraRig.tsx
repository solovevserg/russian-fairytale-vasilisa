import {useFrame, useThree} from "@react-three/fiber";
import {useMemo} from "react";
import {type PerspectiveCamera, Vector3} from "three";

import {debugFlags} from "../debugFlags";
import {urlFlag} from "../lib/url";
import {useSceneStore} from "../state/sceneStore";
import {useStoryStore} from "../state/storyStore";
import {currentSample} from "../story/currentSample";
import {KEYFRAMES} from "../story/scenes";
import {createTimeline} from "../story/timeline";
import {
	type CameraContext,
	type CameraOutput,
	createCameraPipeline,
} from "./camera/pipeline";
import {
	drift,
	PARALLAX_LOOK,
	PARALLAX_SHIFT,
	pointer,
	swayPointer,
} from "./pointerParallax";

// ?time=HH фиксирует время суток (для отладки освещения)
const timeLocked = urlFlag("time");

/**
 * Ведёт камеру, время суток и ветер по таймлайну истории: кадр считает
 * конвейер слоёв (camera/pipeline.ts), здесь — только запись в камеру и
 * в хранилище сцены.
 */
export function CameraRig() {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const pipeline = useMemo(
		() =>
			createCameraPipeline(createTimeline(KEYFRAMES), {
				shift: PARALLAX_SHIFT,
				look: PARALLAX_LOOK,
			}),
		[],
	);
	const ctx = useMemo<CameraContext>(
		() => ({
			delta: 0,
			now: 0,
			reading: useStoryStore.getState(),
			instant: debugFlags.instant,
			pointer: {x: 0, y: 0},
		}),
		[],
	);
	const out = useMemo<CameraOutput>(
		() => ({position: new Vector3(), lookAt: new Vector3(), fov: camera.fov}),
		[camera],
	);

	useFrame(({clock}, delta) => {
		// без мыши (телефон, планшет) — медленное покачивание вместо неё,
		// с мышью — малое покачивание поверх неё
		swayPointer(clock.elapsedTime);
		ctx.delta = delta;
		ctx.now = clock.elapsedTime;
		ctx.reading = useStoryStore.getState();
		ctx.pointer.x = pointer.x + drift.x;
		ctx.pointer.y = pointer.y + drift.y;
		pipeline.step(currentSample, ctx, out);

		camera.position.copy(out.position);
		camera.lookAt(out.lookAt);
		if (Math.abs(camera.fov - out.fov) > 1e-3) {
			camera.fov = out.fov;
			camera.updateProjectionMatrix();
		}

		const scene = useSceneStore.getState();
		const {timeOfDay, wind} = currentSample;
		if (!timeLocked && Math.abs(scene.timeOfDay - timeOfDay) > 1e-4) {
			scene.setTimeOfDay(timeOfDay);
		}
		if (Math.abs(scene.wind - wind) > 1e-4) scene.setWind(wind);
	});

	return null;
}
