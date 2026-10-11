import {useGLTF} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import {useMemo, useRef} from "react";
import type {Group, MeshStandardMaterial, PointLight} from "three";

import {useSceneStore} from "../state/sceneStore";
import {currentSample} from "../story/currentSample";
import {Deferred} from "./Deferred";
import {ChimneySmoke} from "./effects/ChimneySmoke";
import {enableShadows, MODEL_URLS, materialsOf} from "./models";
import MODEL_META from "./models.meta.json" with {type: "json"};
import {paletteAt} from "./sky/timeOfDay";

/**
 * Избушка на курьих ножках — модель «A hut on chicken legs» (vet.doc, CC-BY 4.0).
 * В исходнике ~34 единицы в высоту, дверь смотрит в −X, труба — на +X.
 */
const SCALE = 0.235;
/** Нижняя точка модели (кончики когтей) в её единицах (scripts/prepare-models.ts). */
const MODEL_BOTTOM = MODEL_META.hut.min[1];
/** Поворот, при котором дверь (−X модели) смотрит на ворота и тропу. */
const ROTATION_Y = Math.atan2(0.835, -0.55);
/** Верх трубы в координатах модели. */
const CHIMNEY_TOP: [number, number, number] = [5.9, 15, -5.9];

const CHIMNEY: [number, number, number] = [
	CHIMNEY_TOP[0] * SCALE,
	(CHIMNEY_TOP[1] - MODEL_BOTTOM) * SCALE,
	CHIMNEY_TOP[2] * SCALE,
];

/** Модель избушки — грузится ближе к «Поляне» (Deferred в Hut). */
function HutModel() {
	const {scene} = useGLTF(MODEL_URLS.hut);
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
	const body = useRef<Group>(null);

	useFrame(() => {
		// до «Поляны» избушки нет
		if (body.current) body.current.visible = currentSample.hut;
		const night = paletteAt(useSceneStore.getState().timeOfDay).night;
		for (const m of glowing) m.emissiveIntensity = 0.3 + night * 2.2;
	});

	return (
		<group ref={body}>
			<primitive
				object={model}
				scale={SCALE}
				position-y={-MODEL_BOTTOM * SCALE}
			/>
			<group position={CHIMNEY}>
				<ChimneySmoke />
			</group>
		</group>
	);
}

/**
 * Избушка. Свет из двери — с первого кадра (новый свет перекомпилировал бы
 * все шейдеры сцены), до «Поляны» он погашен; модель грузится позже.
 */
export function Hut() {
	const doorLight = useRef<PointLight>(null);

	useFrame(() => {
		const night = paletteAt(useSceneStore.getState().timeOfDay).night;
		if (doorLight.current) {
			doorLight.current.intensity = currentSample.hut ? night * 6 : 0;
		}
	});

	return (
		<group rotation-y={ROTATION_Y}>
			<Deferred until="clearing">
				<HutModel />
			</Deferred>
			{/* тёплый свет из двери ночью */}
			<pointLight
				ref={doorLight}
				position={[-3.4, 3.2, 0]}
				color="#ffae5c"
				distance={9}
				decay={1.8}
			/>
		</group>
	);
}
