import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MeshStandardMaterial, PointLight } from "three";
import { useSceneStore } from "../state/sceneStore";
import { PORCH } from "../story/keyframes";
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

const PORCH_WOOD = "#5b412b";
const PORCH_WOOD_LIGHT = "#6b4e33";
const STEP_COUNT = 6;
const PLANKS = 9;

/**
 * Крыльцо: помост перед дверью на уровне порога и лестница к воротам.
 * Координаты — в повёрнутой системе избушки (дверь смотрит в −X).
 */
function Porch() {
	const outer = PORCH.wall + PORCH.depth;
	const rise = PORCH.height / STEP_COUNT;
	const run = 0.36;
	return (
		<group>
			{/* настил из досок поперёк стены, с зазорами; снизу — поперечный брус */}
			{Array.from({ length: PLANKS }, (_, i) => (
				<mesh
					// biome-ignore lint/suspicious/noArrayIndexKey: доски статичны
					key={i}
					position={[
						-(PORCH.wall + PORCH.depth / 2),
						PORCH.height - 0.04,
						-PORCH.width / 2 + (i + 0.5) * (PORCH.width / PLANKS),
					]}
					castShadow
					receiveShadow
				>
					<boxGeometry
						args={[PORCH.depth, 0.07, PORCH.width / PLANKS - 0.035]}
					/>
					<meshStandardMaterial
						color={i % 3 === 1 ? PORCH_WOOD_LIGHT : PORCH_WOOD}
						roughness={0.95}
					/>
				</mesh>
			))}
			<mesh position={[-outer + 0.1, PORCH.height - 0.13, 0]} castShadow>
				<boxGeometry args={[0.16, 0.12, PORCH.width]} />
				<meshStandardMaterial color={PORCH_WOOD} roughness={1} />
			</mesh>
			{[-1, 1].map((side) => (
				<mesh
					key={side}
					position={[
						-outer + 0.12,
						PORCH.height / 2,
						side * (PORCH.width / 2 - 0.12),
					]}
					castShadow
				>
					<cylinderGeometry args={[0.07, 0.09, PORCH.height, 7]} />
					<meshStandardMaterial color={PORCH_WOOD} roughness={1} />
				</mesh>
			))}
			{Array.from({ length: STEP_COUNT }, (_, i) => (
				<mesh
					// biome-ignore lint/suspicious/noArrayIndexKey: ступени статичны
					key={i}
					position={[
						-outer - run * (i + 0.5),
						PORCH.height - rise * (i + 1) + 0.05,
						0,
					]}
					castShadow
					receiveShadow
				>
					<boxGeometry args={[run + 0.04, 0.1, 1.1]} />
					<meshStandardMaterial color={PORCH_WOOD} roughness={0.95} />
				</mesh>
			))}
		</group>
	);
}

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
			<Porch />
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
