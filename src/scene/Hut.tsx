import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshStandardMaterial } from "three";
import { useSceneStore } from "../state/sceneStore";
import { ChimneySmoke } from "./effects/ChimneySmoke";
import { paletteAt } from "./sky/timeOfDay";

// Заглушка избушки на курьих ножках из примитивов. На этапе 5 заменяется моделью.
const LEG_COLOR = "#c9a36b";
const WOOD_COLOR = "#5b3d27";
/** Труба на скате крыши (координаты внутри сруба). */
const CHIMNEY: [number, number, number] = [0.8, 2.3, -0.55];

function Leg({ x }: { x: number }) {
	return (
		<group position={[x, 0, 0]}>
			{/* бедро и голень — «колено» назад, как у птицы */}
			<mesh position={[0, 2.4, -0.3]} rotation-x={0.35} castShadow>
				<cylinderGeometry args={[0.35, 0.25, 1.8, 8]} />
				<meshStandardMaterial color={LEG_COLOR} roughness={0.8} />
			</mesh>
			<mesh position={[0, 0.9, -0.3]} rotation-x={-0.35} castShadow>
				<cylinderGeometry args={[0.15, 0.12, 1.8, 8]} />
				<meshStandardMaterial color={LEG_COLOR} roughness={0.8} />
			</mesh>
			{/* пальцы */}
			{[-0.5, 0, 0.5].map((angle) => (
				<mesh
					key={angle}
					position={[Math.sin(angle) * 0.45, 0.06, Math.cos(angle) * 0.45]}
					rotation={[Math.PI / 2, 0, -angle]}
					castShadow
				>
					<coneGeometry args={[0.08, 0.9, 6]} />
					<meshStandardMaterial color={LEG_COLOR} roughness={0.8} />
				</mesh>
			))}
		</group>
	);
}

export function Hut() {
	const windowMaterial = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		const night = paletteAt(useSceneStore.getState().timeOfDay).night;
		if (windowMaterial.current)
			windowMaterial.current.emissiveIntensity = 0.2 + night * 2.5;
	});

	return (
		<group>
			<Leg x={-0.9} />
			<Leg x={0.9} />
			<group position={[0, 4.6, 0]}>
				<mesh castShadow receiveShadow>
					<boxGeometry args={[3.6, 2.4, 3]} />
					<meshStandardMaterial color={WOOD_COLOR} roughness={0.95} />
				</mesh>
				<mesh position={[0, 2, 0]} rotation-y={Math.PI / 4} castShadow>
					<coneGeometry args={[3.1, 1.8, 4]} />
					<meshStandardMaterial color="#3d3022" roughness={1} />
				</mesh>
				{/* окошко */}
				<mesh position={[0, 0.1, 1.51]}>
					<planeGeometry args={[0.8, 0.7]} />
					<meshStandardMaterial
						ref={windowMaterial}
						color="#3a2410"
						emissive="#ff9a2e"
					/>
				</mesh>
				{/* труба */}
				<mesh position={CHIMNEY} castShadow>
					<boxGeometry args={[0.45, 1.3, 0.45]} />
					<meshStandardMaterial color="#4a3b30" roughness={1} />
				</mesh>
				<group position={[CHIMNEY[0], CHIMNEY[1] + 0.7, CHIMNEY[2]]}>
					<ChimneySmoke />
				</group>
			</group>
		</group>
	);
}
