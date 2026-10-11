import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import {
	type DirectionalLight,
	FogExp2,
	type HemisphereLight,
	Vector3,
} from "three";
import { useSceneStore } from "../../state/sceneStore";
import { currentSample } from "../../story/currentSample";
import { quality } from "../quality";
import { moonDirection, paletteAt, sunDirection } from "./timeOfDay";

const LIGHT_DISTANCE = 60;
/**
 * Полуширина области теней, м. Она не стоит на месте, а едет за камерой
 * (центр — впереди, куда камера смотрит): так плотнее текселей на кадр, а в
 * проход теней не попадает лес за спиной.
 */
const SHADOW_HALF = 32;
/** Как далеко впереди камеры центр области теней, м. */
const SHADOW_AHEAD = 18;
const shadowCenter = new Vector3();
const lightRight = new Vector3();
const lightUp = new Vector3();
const lightBack = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);
const MOON_COLOR = "#9db4ff";
const sunDir = new Vector3();
const moonDir = new Vector3();

/**
 * Область теней — вокруг точки впереди камеры. Центр сдвигается целыми
 * текселями карты теней (в осях лампы), иначе тени «дрожат» при движении.
 */
function followCamera(
	light: DirectionalLight,
	eye: Vector3,
	look: Vector3,
): void {
	shadowCenter.subVectors(look, eye);
	shadowCenter.y = 0;
	const ahead = Math.min(shadowCenter.length(), SHADOW_AHEAD);
	shadowCenter.normalize().multiplyScalar(ahead).add(eye);
	shadowCenter.y = look.y;

	// оси лампы: «назад» — к лампе, вправо и вверх — плоскость карты теней
	lightBack.copy(light.position).normalize();
	lightRight.crossVectors(WORLD_UP, lightBack);
	if (lightRight.lengthSq() < 1e-6) lightRight.set(1, 0, 0);
	lightRight.normalize();
	lightUp.crossVectors(lightBack, lightRight);
	const texel = (SHADOW_HALF * 2) / quality.shadowMapSize;
	const r = Math.round(shadowCenter.dot(lightRight) / texel) * texel;
	const u = Math.round(shadowCenter.dot(lightUp) / texel) * texel;
	const b = shadowCenter.dot(lightBack);
	shadowCenter
		.copy(lightRight)
		.multiplyScalar(r)
		.addScaledVector(lightUp, u)
		.addScaledVector(lightBack, b);

	light.target.position.copy(shadowCenter);
	light.target.updateMatrixWorld();
	light.position.add(shadowCenter);
}

/**
 * Солнце / луна, небесная подсветка и туман по времени суток.
 * Одна направленная лампа: днём — солнце, ночью — луна (меньше теней, холодный цвет).
 */
export function Lighting() {
	const scene = useThree((state) => state.scene);
	const camera = useThree((state) => state.camera);
	const gl = useThree((state) => state.gl);
	const frame = useRef(0);

	// на телефонах карта теней перерисовывается через кадр (quality.shadowEvery)
	useLayoutEffect(() => {
		if (quality.shadowEvery <= 1) return;
		gl.shadowMap.autoUpdate = false;
		return () => {
			gl.shadowMap.autoUpdate = true;
		};
	}, [gl]);
	const light = useRef<DirectionalLight>(null);
	const hemi = useRef<HemisphereLight>(null);

	useLayoutEffect(() => {
		const fog = new FogExp2("#000000", 0.02);
		scene.fog = fog;
		return () => {
			scene.fog = null;
		};
	}, [scene]);

	useFrame(() => {
		const hours = useSceneStore.getState().timeOfDay;
		const palette = paletteAt(hours);
		sunDirection(hours, sunDir);
		moonDirection(hours, moonDir);

		if (scene.fog instanceof FogExp2) {
			scene.fog.color.set(palette.horizon);
			// туман стелется по земле: с высоты над кронами видно дальше
			const altitude = Math.min(Math.max((camera.position.y - 8) / 27, 0), 1);
			scene.fog.density =
				currentSample.fog *
				palette.fogDensity *
				(1 - 0.7 * altitude * altitude * (3 - 2 * altitude));
		}

		const l = light.current;
		if (quality.shadowEvery > 1) {
			frame.current = (frame.current + 1) % quality.shadowEvery;
			if (frame.current === 0) gl.shadowMap.needsUpdate = true;
		}
		if (l) {
			// у горизонта солнце гаснет плавно, затем лампа становится луной
			const sunFade = Math.min(Math.max(sunDir.y / 0.12, 0), 1);
			const useSun = palette.sunIntensity * sunFade >= palette.moonIntensity;
			if (useSun) {
				l.position.copy(sunDir).multiplyScalar(LIGHT_DISTANCE);
				l.color.set(palette.sunColor);
				l.intensity = palette.sunIntensity * sunFade;
			} else {
				l.position.copy(moonDir).multiplyScalar(LIGHT_DISTANCE);
				l.color.set(MOON_COLOR);
				l.intensity = palette.moonIntensity;
			}
			followCamera(l, camera.position, currentSample.target);
		}

		const h = hemi.current;
		if (h) {
			h.color.set(palette.hemiSky);
			h.groundColor.set(palette.hemiGround);
			h.intensity = palette.hemiIntensity;
		}
	});

	return (
		<>
			<hemisphereLight ref={hemi} />
			<directionalLight
				ref={light}
				castShadow
				shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
				shadow-bias={-0.0004}
				shadow-normalBias={0.04}
				shadow-camera-near={10}
				shadow-camera-far={140}
				shadow-camera-left={-SHADOW_HALF}
				shadow-camera-right={SHADOW_HALF}
				shadow-camera-top={SHADOW_HALF}
				shadow-camera-bottom={-SHADOW_HALF}
			/>
		</>
	);
}
