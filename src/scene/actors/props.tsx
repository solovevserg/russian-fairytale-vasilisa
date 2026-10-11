import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
	AdditiveBlending,
	DoubleSide,
	type Object3D,
	type PointLight,
	type SpotLight,
} from "three";

import { currentSample } from "../../story/currentSample";
import {
	type ParticleUniforms,
	RisingParticles,
} from "../effects/RisingParticles";
import { SKULL_EYE, useSkullGeometry } from "../models";
import { isShown } from "./presence";

const SKIN = "#e8c3a4";

const DOLL_DRESS = "#c8463a";

/** Куколка Василисы (~20 см): сарафанчик с рукавами, платочек. */
export function Doll({
	scale = 1,
	casting = false,
}: {
	scale?: number;
	/** Колдует: ручки подняты и водят над головой. */
	casting?: boolean;
}) {
	const arms = useRef<(Object3D | null)[]>([]);
	useFrame(({ clock }) => {
		if (!casting) return;
		const t = clock.elapsedTime;
		arms.current.forEach((arm, i) => {
			if (!arm) return;
			const side = i === 0 ? -1 : 1;
			// ручки вверх-вперёд и плавные круги — как будто ворожит
			const phase = t * 2.6 + i * Math.PI;
			arm.rotation.set(
				-1.9 + Math.sin(phase) * 0.45,
				0,
				side * (0.5 + Math.cos(phase) * 0.35),
			);
		});
	});
	return (
		<group scale={scale}>
			<mesh position={[0, 0.06, 0]}>
				<coneGeometry args={[0.05, 0.12, 10]} />
				<meshStandardMaterial color={DOLL_DRESS} roughness={0.9} />
			</mesh>
			{/* ручки: рукава от плеч чуть вперёд и в стороны, ладошки */}
			{[-1, 1].map((side, i) => (
				<group
					key={side}
					ref={(el) => {
						arms.current[i] = el;
					}}
					position={[side * 0.022, 0.112, 0]}
					rotation={[-0.35, 0, side * 0.55]}
				>
					<mesh position={[0, -0.03, 0]}>
						<cylinderGeometry args={[0.009, 0.011, 0.06, 6]} />
						<meshStandardMaterial color={DOLL_DRESS} roughness={0.9} />
					</mesh>
					<mesh position={[0, -0.064, 0]}>
						<sphereGeometry args={[0.009, 6, 5]} />
						<meshStandardMaterial color={SKIN} roughness={0.8} />
					</mesh>
				</group>
			))}
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
	const hover = useRef<Object3D>(null);
	useFrame(({ clock }) => {
		const pulse = 0.8 + 0.2 * Math.sin(clock.elapsedTime * 3.1);
		// парит над настилом, чуть покачиваясь
		if (hover.current)
			hover.current.position.y = Math.sin(clock.elapsedTime * 1.7) * 0.04;
		if (light.current) {
			light.current.intensity = isShown(light.current)
				? currentSample.magic * 6 * pulse
				: 0;
		}
	});
	return (
		<group>
			<group ref={hover}>
				<Doll scale={2} casting />
			</group>
			<pointLight
				ref={light}
				position={[0, 0.5, 0]}
				color="#a9d4ff"
				distance={6}
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

/** Длина лучей из глаз черепа, м. */
const BEAM_LENGTH = 4;

/**
 * Череп на палке со светящимися глазами. С `beams` из глаз бьют лучи
 * (светящиеся конусы) и направленный свет вперёд.
 */
export function SkullLantern({
	length = 1.5,
	stick = true,
	beams = false,
}: {
	length?: number;
	/** false — только череп (насаживается на чужую палку, например клюку) */
	stick?: boolean;
	beams?: boolean;
}) {
	const skull = useSkullGeometry();
	const light = useRef<PointLight>(null);
	const spot = useRef<SpotLight>(null);
	const target = useRef<Object3D>(null);
	useEffect(() => {
		if (spot.current && target.current) spot.current.target = target.current;
	}, []);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const flicker = 0.85 + 0.1 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23);
		const shown = light.current ? isShown(light.current) : false;
		if (light.current) light.current.intensity = shown ? 5 * flicker : 0;
		if (spot.current) spot.current.intensity = shown ? 40 * flicker : 0;
	});
	return (
		<group>
			{stick && (
				<mesh position={[0, length / 2, 0]} castShadow>
					<cylinderGeometry args={[0.018, 0.022, length, 6]} />
					<meshStandardMaterial color="#4a3524" roughness={1} />
				</mesh>
			)}
			<group position={[0, stick ? length + 0.1 : 0.08, 0]}>
				<mesh geometry={skull} castShadow>
					<meshStandardMaterial color="#ddd3bd" roughness={0.7} flatShading />
				</mesh>
				{[-1, 1].map((side) => (
					<group
						key={side}
						position={[side * SKULL_EYE[0], SKULL_EYE[1], SKULL_EYE[2]]}
					>
						<mesh>
							<sphereGeometry args={[0.02, 8, 6]} />
							<meshBasicMaterial color="#ffd24a" toneMapped={false} />
						</mesh>
						{beams && (
							// конус остриём к глазу, раструбом вперёд
							<mesh
								position={[side * 0.05, -0.04, BEAM_LENGTH / 2]}
								rotation-x={-Math.PI / 2}
							>
								<coneGeometry args={[0.32, BEAM_LENGTH, 16, 1, true]} />
								<meshBasicMaterial
									color="#ffd45a"
									transparent
									opacity={0.16}
									blending={AdditiveBlending}
									depthWrite={false}
									side={DoubleSide}
									toneMapped={false}
								/>
							</mesh>
						)}
					</group>
				))}
				<pointLight
					ref={light}
					position={[0, 0, 0.25]}
					color="#ffc23a"
					distance={9}
					decay={1.7}
				/>
				{beams && (
					<>
						<spotLight
							ref={spot}
							position={[0, 0, 0.12]}
							color="#ffd36a"
							angle={0.32}
							penumbra={0.6}
							distance={16}
							decay={1.4}
						/>
						<object3D ref={target} position={[0, -0.6, 5]} />
					</>
				)}
			</group>
		</group>
	);
}
