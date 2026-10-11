import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group, type PointLight } from "three";

import { useSceneStore } from "../state/sceneStore";
import { currentSample } from "../story/currentSample";
import { paletteAt } from "./sky/timeOfDay";

const POLE_HEIGHT = 2.2;
const FLAME_COLOR = "#ff8a2a";

interface TorchProps {
	position: [number, number, number];
	/** Сдвиг фазы мерцания, чтобы факелы не мигали синхронно. */
	phase?: number;
}

export function Torch({ position, phase = 0 }: TorchProps) {
	const light = useRef<PointLight>(null);
	const flame = useRef<Group>(null);
	const body = useRef<Group>(null);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime + phase;
		// мерцание огня: сумма несоизмеримых синусов ≈ шум
		const flicker =
			0.8 +
			0.12 * Math.sin(t * 9.1) +
			0.08 * Math.sin(t * 23.7) +
			0.06 * Math.sin(t * 4.3 + 1.7);
		const night = paletteAt(useSceneStore.getState().timeOfDay).night;
		const glow = 0.25 + 0.75 * night;
		// факелы — у избушки: до «Поляны» их нет (свет гасим, а не прячем)
		const shown = currentSample.hut;
		if (body.current) body.current.visible = shown;
		if (light.current)
			light.current.intensity = shown ? 22 * flicker * glow : 0;
		if (flame.current) {
			flame.current.scale.set(1, flicker * 1.1, 1);
			flame.current.rotation.y = t * 0.7;
		}
	});

	return (
		<group position={position}>
			<group ref={body}>
				<mesh position={[0, POLE_HEIGHT / 2, 0]} castShadow>
					<cylinderGeometry args={[0.05, 0.07, POLE_HEIGHT, 6]} />
					<meshStandardMaterial color="#3a2818" roughness={1} />
				</mesh>
				{/* обмотка из пакли */}
				<mesh position={[0, POLE_HEIGHT, 0]}>
					<cylinderGeometry args={[0.1, 0.07, 0.25, 8]} />
					<meshStandardMaterial
						color="#2a1c10"
						roughness={1}
						emissive="#ff5a10"
						emissiveIntensity={0.4}
					/>
				</mesh>
				<group ref={flame} position={[0, POLE_HEIGHT + 0.1, 0]}>
					<mesh position={[0, 0.22, 0]}>
						<coneGeometry args={[0.13, 0.5, 8, 1, true]} />
						<meshBasicMaterial
							color={FLAME_COLOR}
							transparent
							opacity={0.85}
							blending={AdditiveBlending}
							depthWrite={false}
							toneMapped={false}
						/>
					</mesh>
					<mesh position={[0, 0.15, 0]}>
						<coneGeometry args={[0.07, 0.3, 8, 1, true]} />
						<meshBasicMaterial
							color="#ffe08a"
							transparent
							blending={AdditiveBlending}
							depthWrite={false}
							toneMapped={false}
						/>
					</mesh>
				</group>
			</group>
			<pointLight
				ref={light}
				position={[0, POLE_HEIGHT + 0.4, 0]}
				color={FLAME_COLOR}
				distance={14}
				decay={2}
			/>
		</group>
	);
}
