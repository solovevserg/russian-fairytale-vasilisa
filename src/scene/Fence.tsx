import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
	Color,
	type Group,
	type InstancedMesh,
	type MeshBasicMaterial,
	Object3D,
	type PointLight,
} from "three";
import { createRandom } from "../lib/random";
import { currentSample } from "../story/currentSample";
import { SKULL_EYE, useSkullGeometry } from "./models";
import { heightAt } from "./terrain";

export const FENCE_RADIUS = 6.5;
/** Ворота смотрят на тропу (направление PATH_DIRECTION в terrain.ts). */
const GATE_ANGLE = Math.atan2(0.835, 0.55);
const GATE_HALF_WIDTH = 0.2; // радианы, ~2.6 м
const STAKE_SPACING = 0.42;
/** Череп на каждом N-м коле. */
const SKULL_EVERY = 5;
const BONE = "#c4b9a2";
/** Черепа на кольях чуть крупнее натуральной величины — чтобы читались издали. */
const SKULL_SCALE = 1.15;

const EYES_OFF = new Color("#1a1208");
const EYES_ON = new Color("#ffd24a");

interface Stake {
	x: number;
	y: number;
	z: number;
	height: number;
	tilt: number;
	angle: number;
}

function layoutStakes(): Stake[] {
	const random = createRandom(99);
	const count = Math.round((2 * Math.PI * FENCE_RADIUS) / STAKE_SPACING);
	const stakes: Stake[] = [];
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2;
		const fromGate = Math.atan2(
			Math.sin(angle - GATE_ANGLE),
			Math.cos(angle - GATE_ANGLE),
		);
		if (Math.abs(fromGate) < GATE_HALF_WIDTH) continue;
		const x = Math.cos(angle) * FENCE_RADIUS;
		const z = Math.sin(angle) * FENCE_RADIUS;
		stakes.push({
			x,
			y: heightAt(x, z),
			z,
			height: 1.5 + random() * 0.45,
			tilt: (random() - 0.5) * 0.08,
			angle,
		});
	}
	return stakes;
}

/**
 * Частокол вокруг избушки; на части кольев — черепа. Глаза черепов
 * загораются, когда в таймлайне растёт `skulls` (глава «Чёрный всадник»).
 */
export function Fence() {
	const stakes = useMemo(layoutStakes, []);
	const skullGeometry = useSkullGeometry();
	const skulls = useMemo(
		() => stakes.filter((_, i) => i % SKULL_EVERY === 2),
		[stakes],
	);

	const posts = useRef<InstancedMesh>(null);
	const tips = useRef<InstancedMesh>(null);
	const heads = useRef<InstancedMesh>(null);
	const eyes = useRef<InstancedMesh>(null);
	const eyeMaterial = useRef<MeshBasicMaterial>(null);
	const glow = useRef<PointLight>(null);
	const body = useRef<Group>(null);
	const bars = useRef<Group>(null);

	useLayoutEffect(() => {
		const dummy = new Object3D();
		stakes.forEach((s, i) => {
			dummy.position.set(s.x, s.y + s.height / 2, s.z);
			dummy.rotation.set(s.tilt, s.angle, -s.tilt);
			dummy.scale.set(1, s.height, 1);
			dummy.updateMatrix();
			posts.current?.setMatrixAt(i, dummy.matrix);
			dummy.position.y = s.y + s.height + 0.08;
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			tips.current?.setMatrixAt(i, dummy.matrix);
		});
		skulls.forEach((s, i) => {
			// череп насажен на кол и смотрит наружу, от избушки
			const top = s.y + s.height + 0.05;
			dummy.position.set(s.x, top, s.z);
			dummy.rotation.set(0, Math.PI / 2 - s.angle, 0);
			dummy.scale.setScalar(SKULL_SCALE);
			dummy.updateMatrix();
			heads.current?.setMatrixAt(i, dummy.matrix);
			for (const side of [-1, 1]) {
				const local = dummy.clone();
				local.scale.set(1, 1, 1);
				local.translateX(side * SKULL_EYE[0] * SKULL_SCALE);
				local.translateY(SKULL_EYE[1] * SKULL_SCALE);
				local.translateZ(SKULL_EYE[2] * SKULL_SCALE);
				local.updateMatrix();
				eyes.current?.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), local.matrix);
			}
		});
		for (const mesh of [
			posts.current,
			tips.current,
			heads.current,
			eyes.current,
		]) {
			if (!mesh) continue;
			mesh.instanceMatrix.needsUpdate = true;
			mesh.computeBoundingSphere();
		}
	}, [stakes, skulls]);

	useFrame(({ clock }) => {
		const lit = currentSample.skulls;
		// глаза тлеют и чуть мерцают, как угли
		const flicker = 0.9 + 0.1 * Math.sin(clock.elapsedTime * 7.3);
		eyeMaterial.current?.color.copy(EYES_OFF).lerp(EYES_ON, lit * flicker);
		// частокол — у избушки: до «Поляны» его нет (свет гасим, а не прячем)
		const shown = currentSample.hut;
		if (body.current) body.current.visible = shown;
		if (bars.current) bars.current.visible = shown;
		if (glow.current) glow.current.intensity = shown ? lit * 14 * flicker : 0;
	});

	return (
		<group>
			<group ref={body}>
				<instancedMesh
					ref={posts}
					args={[undefined, undefined, stakes.length]}
					castShadow
					receiveShadow
				>
					<cylinderGeometry args={[0.05, 0.065, 1, 6]} />
					<meshStandardMaterial color={BONE} roughness={0.9} />
				</instancedMesh>
				<instancedMesh
					ref={tips}
					args={[undefined, undefined, stakes.length]}
					castShadow
				>
					<coneGeometry args={[0.05, 0.16, 6]} />
					<meshStandardMaterial color={BONE} roughness={0.9} />
				</instancedMesh>
				<instancedMesh
					ref={heads}
					args={[skullGeometry, undefined, skulls.length]}
					castShadow
				>
					<meshStandardMaterial color="#ddd3bd" roughness={0.7} flatShading />
				</instancedMesh>
				<instancedMesh
					ref={eyes}
					args={[undefined, undefined, skulls.length * 2]}
				>
					<sphereGeometry args={[0.022, 8, 6]} />
					<meshBasicMaterial ref={eyeMaterial} toneMapped={false} />
				</instancedMesh>
			</group>
			{/* общий отсвет от горящих глаз на избушку и землю */}
			<pointLight
				ref={glow}
				position={[0, heightAt(0, 0) + 2.2, 0]}
				color="#ffc94a"
				distance={16}
				decay={1.6}
			/>
			{/* перекладины частокола с разрывом под ворота */}
			<group ref={bars}>
				{[0.55, 1.2].map((y) => (
					<mesh
						key={y}
						position={[0, heightAt(0, 0) + y, 0]}
						rotation={[Math.PI / 2, 0, GATE_ANGLE + GATE_HALF_WIDTH]}
						castShadow
					>
						<torusGeometry
							args={[
								FENCE_RADIUS,
								0.035,
								5,
								96,
								Math.PI * 2 - GATE_HALF_WIDTH * 2,
							]}
						/>
						<meshStandardMaterial color="#8a7e68" roughness={1} />
					</mesh>
				))}
			</group>
		</group>
	);
}
