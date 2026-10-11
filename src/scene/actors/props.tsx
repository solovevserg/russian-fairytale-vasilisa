import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PointLight } from "three";
import { currentSample } from "../../story/currentSample";
import {
	type ParticleUniforms,
	RisingParticles,
} from "../effects/RisingParticles";
import { isShown } from "./presence";

const SKIN = "#e8c3a4";

/** Куколка Василисы (~20 см): сарафанчик, платочек. */
export function Doll({ scale = 1 }: { scale?: number }) {
	return (
		<group scale={scale}>
			<mesh position={[0, 0.06, 0]}>
				<coneGeometry args={[0.05, 0.12, 10]} />
				<meshStandardMaterial color="#c8463a" roughness={0.9} />
			</mesh>
			<mesh position={[0, 0.145, 0]}>
				<sphereGeometry args={[0.028, 10, 8]} />
				<meshStandardMaterial color={SKIN} roughness={0.8} />
			</mesh>
			<mesh position={[0, 0.155, -0.004]} scale={[1.1, 1, 1.1]}>
				<sphereGeometry args={[0.03, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
				<meshStandardMaterial color="#e9d27a" roughness={0.9} />
			</mesh>
		</group>
	);
}

function updateMagic(u: ParticleUniforms) {
	u.uOpacity.value = currentSample.magic;
	u.uDrift.value.set(0, 0.2, 0);
}

/** Куколка колдует: голубоватый свет и искры. Видна, пока `magic` > 0. */
export function DollMagic() {
	const light = useRef<PointLight>(null);
	useFrame(({ clock }) => {
		const pulse = 0.8 + 0.2 * Math.sin(clock.elapsedTime * 3.1);
		if (light.current) {
			light.current.intensity = isShown(light.current)
				? currentSample.magic * 6 * pulse
				: 0;
		}
	});
	return (
		<group>
			<Doll scale={1.3} />
			<pointLight
				ref={light}
				position={[0, 0.35, 0]}
				color="#a9d4ff"
				distance={5}
				decay={1.8}
			/>
			<group position={[0, 0.12, 0]}>
				<RisingParticles
					count={70}
					life={2.6}
					rise={1.3}
					spread={0.35}
					size={0.06}
					grow={0.4}
					color="#bfe0ff"
					additive
					seed={11}
					update={updateMagic}
				/>
			</group>
		</group>
	);
}

/** Череп на палке со светящимися глазами — светоч Бабы Яги. */
export function SkullLantern({
	length = 1.5,
	stick = true,
}: {
	length?: number;
	/** false — только череп (насаживается на чужую палку, например клюку) */
	stick?: boolean;
}) {
	const light = useRef<PointLight>(null);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const flicker = 0.85 + 0.1 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23);
		if (light.current) {
			light.current.intensity = isShown(light.current) ? 5 * flicker : 0;
		}
	});
	return (
		<group>
			{stick && (
				<mesh position={[0, length / 2, 0]} castShadow>
					<cylinderGeometry args={[0.018, 0.022, length, 6]} />
					<meshStandardMaterial color="#4a3524" roughness={1} />
				</mesh>
			)}
			<group position={[0, stick ? length + 0.08 : 0.06, 0]}>
				<mesh scale={[1, 1.15, 1.05]} castShadow>
					<sphereGeometry args={[0.1, 12, 10]} />
					<meshStandardMaterial color="#ddd3bd" roughness={0.7} />
				</mesh>
				{[-1, 1].map((side) => (
					<mesh key={side} position={[side * 0.038, 0.02, 0.085]}>
						<sphereGeometry args={[0.024, 8, 6]} />
						<meshBasicMaterial color="#ffd24a" toneMapped={false} />
					</mesh>
				))}
				<pointLight
					ref={light}
					position={[0, 0, 0.25]}
					color="#ffc23a"
					distance={9}
					decay={1.7}
				/>
			</group>
		</group>
	);
}
