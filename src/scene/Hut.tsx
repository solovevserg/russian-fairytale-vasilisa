import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MeshStandardMaterial, PointLight } from "three";
import { useSceneStore } from "../state/sceneStore";
import { ChimneySmoke } from "./effects/ChimneySmoke";
import { enableShadows, MODEL_URLS, materialsOf } from "./models";
import { paletteAt } from "./sky/timeOfDay";

/**
 * Избушка на курьих ножках — модель «A hut on chicken legs» (vet.doc, CC-BY 4.0).
 * В исходнике ~34 единицы в высоту, дверь смотрит в −X, труба — на +X.
 */
const SCALE = 0.235;
/** Нижняя точка модели (кончики когтей) в её единицах. */
const MODEL_BOTTOM = -16.3;
/** Поворот, при котором дверь (−X модели) смотрит на ворота и тропу. */
const ROTATION_Y = Math.atan2(0.835, -0.55);
/** Верх трубы в координатах модели. */
const CHIMNEY_TOP: [number, number, number] = [5.9, 15, -5.9];

export function Hut() {
	const { scene } = useGLTF(MODEL_URLS.hut);
	const model = useMemo(() => {
		const clone = scene.clone(true);
		enableShadows(clone);
		return clone;
	}, [scene]);
	// окна и фонари у двери нарисованы эмиссивной текстурой — их и «зажигаем» ночью
	const glowing = useMemo(
		() =>
			materialsOf(model).filter(
				(m): m is MeshStandardMaterial =>
					"emissiveMap" in m && !!(m as MeshStandardMaterial).emissiveMap,
			),
		[model],
	);
	const doorLight = useRef<PointLight>(null);

	useFrame(() => {
		const night = paletteAt(useSceneStore.getState().timeOfDay).night;
		for (const m of glowing) m.emissiveIntensity = 0.3 + night * 2.2;
		if (doorLight.current) doorLight.current.intensity = night * 6;
	});

	const chimney: [number, number, number] = [
		CHIMNEY_TOP[0] * SCALE,
		(CHIMNEY_TOP[1] - MODEL_BOTTOM) * SCALE,
		CHIMNEY_TOP[2] * SCALE,
	];

	return (
		<group rotation-y={ROTATION_Y}>
			<primitive
				object={model}
				scale={SCALE}
				position-y={-MODEL_BOTTOM * SCALE}
			/>
			{/* тёплый свет из двери ночью */}
			<pointLight
				ref={doorLight}
				position={[-3.4, 3.2, 0]}
				color="#ffae5c"
				distance={9}
				decay={1.8}
			/>
			<group position={chimney}>
				<ChimneySmoke />
			</group>
		</group>
	);
}
