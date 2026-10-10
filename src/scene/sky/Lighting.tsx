import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import {
	type DirectionalLight,
	FogExp2,
	type HemisphereLight,
	Vector3,
} from "three";
import { useSceneStore } from "../../state/sceneStore";
import { moonDirection, paletteAt, sunDirection } from "./timeOfDay";

const LIGHT_DISTANCE = 60;
const MOON_COLOR = "#9db4ff";
const sunDir = new Vector3();
const moonDir = new Vector3();

/**
 * Солнце / луна, небесная подсветка и туман по времени суток.
 * Одна направленная лампа: днём — солнце, ночью — луна (меньше теней, холодный цвет).
 */
export function Lighting() {
	const scene = useThree((state) => state.scene);
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
			scene.fog.density = palette.fogDensity;
		}

		const l = light.current;
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
				shadow-mapSize={[2048, 2048]}
				shadow-bias={-0.0004}
				shadow-normalBias={0.04}
				shadow-camera-near={10}
				shadow-camera-far={140}
				shadow-camera-left={-40}
				shadow-camera-right={40}
				shadow-camera-top={40}
				shadow-camera-bottom={-40}
			/>
		</>
	);
}
