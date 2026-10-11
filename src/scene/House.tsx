import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MeshStandardMaterial, PointLight } from "three";
import { useSceneStore } from "../state/sceneStore";
import { enableShadows, MODEL_URLS, materialsOf } from "./models";
import { paletteAt } from "./sky/timeOfDay";
import { HOME } from "./terrain";

/** Материал окон в модели «Cabin» — ночью светится, как от лучины. */
const WINDOW_MATERIAL = "_crayfishdiffuse";

/**
 * Изба Василисы — «Cabin» (Poly by Google, CC-BY 3.0): сруб у начала тропы,
 * отсюда Василиса уходит в лес и сюда возвращается с черепом.
 */
export function House() {
	const { scene } = useGLTF(MODEL_URLS.house);
	const model = useMemo(() => {
		const clone = scene.clone(true);
		enableShadows(clone);
		return clone;
	}, [scene]);
	const windows = useMemo(
		() =>
			materialsOf(model).filter(
				(m): m is MeshStandardMaterial => m.name === WINDOW_MATERIAL,
			),
		[model],
	);
	const glow = useRef<PointLight>(null);

	useFrame(() => {
		const night = paletteAt(useSceneStore.getState().timeOfDay).night;
		for (const m of windows) {
			m.emissive.set("#ffb45c");
			m.emissiveIntensity = night * 1.6;
		}
		if (glow.current) glow.current.intensity = night * 5;
	});

	return (
		<group position={[HOME.x, HOME.ground, HOME.z]} rotation-y={HOME.heading}>
			<primitive object={model} />
			<pointLight
				ref={glow}
				position={[0, 1.6, 4.8]}
				color="#ffb45c"
				distance={9}
				decay={1.6}
			/>
		</group>
	);
}
