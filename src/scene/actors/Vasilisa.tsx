import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, PointLight } from "three";
import { currentSample } from "../../story/currentSample";
import { paletteAt } from "../sky/timeOfDay";
import { heightAt } from "../terrain";
import { setShown } from "./presence";
import { Doll, DollMagic, SkullLantern } from "./props";

const SKIN = "#e8c3a4";
const SARAFAN = "#9b2b23";
const BLOUSE = "#efe6d6";
const HAIR = "#8a6534";
const SHOULDER_Y = 1.17;
const ARM_LENGTH = 0.45;

function Arm({ side }: { side: -1 | 1 }) {
	return (
		<>
			<mesh position={[0, -ARM_LENGTH / 2, 0]} castShadow>
				<cylinderGeometry args={[0.045, 0.035, ARM_LENGTH, 8]} />
				<meshStandardMaterial color={BLOUSE} roughness={0.9} />
			</mesh>
			<mesh position={[side * 0.005, -ARM_LENGTH - 0.02, 0]}>
				<sphereGeometry args={[0.035, 8, 6]} />
				<meshStandardMaterial color={SKIN} roughness={0.8} />
			</mesh>
		</>
	);
}

/**
 * Василиса — заглушка из примитивов (сарафан, рубаха, коса), ~1.45 м.
 * Позу, положение и предмет в руках берёт из таймлайна; походка — от скорости.
 */
export function Vasilisa() {
	const root = useRef<Group>(null);
	const body = useRef<Group>(null);
	const armL = useRef<Group>(null);
	const armR = useRef<Group>(null);
	const doll = useRef<Group>(null);
	const lantern = useRef<Group>(null);
	const magic = useRef<Group>(null);
	const motion = useRef({ x: 0, z: 0, phase: 0, speed: 0 });
	const moonlight = useRef<PointLight>(null);

	useFrame((_, delta) => {
		const v = currentSample.vasilisa;
		const r = root.current;
		if (!r || !body.current || !armL.current || !armR.current) return;
		setShown(r, v.visible);
		if (!v.visible) {
			if (moonlight.current) moonlight.current.intensity = 0;
			return;
		}

		// скорость — по смещению за кадр, сглаженная
		const m = motion.current;
		const dt = Math.max(delta, 1e-3);
		const speed = Math.hypot(v.x - m.x, v.z - m.z) / dt;
		m.speed += (Math.min(speed, 3) - m.speed) * Math.min(dt * 6, 1);
		m.x = v.x;
		m.z = v.z;
		const walking = v.pose !== "sleep" && m.speed > 0.08;
		m.phase += dt * (walking ? 4 + m.speed * 2 : 0);

		r.position.set(v.x, heightAt(v.x, v.z), v.z);
		r.rotation.y = v.heading;

		const sleeping = v.pose === "sleep";
		const step = Math.sin(m.phase);
		const amount = Math.min(m.speed / 0.6, 1);
		body.current.rotation.set(
			sleeping ? -Math.PI / 2 : 0,
			0,
			walking ? step * 0.03 * amount : 0,
		);
		body.current.position.set(
			0,
			sleeping ? 0.3 : Math.abs(step) * 0.025 * amount,
			sleeping ? 0.6 : 0,
		);

		// руки: держит куколку у груди, поднимает череп-светоч или машет при ходьбе
		if (v.prop === "doll" && !sleeping) {
			armL.current.rotation.set(-1.0, 0, 0.45);
			armR.current.rotation.set(-1.0, 0, -0.45);
		} else if (v.prop === "skull" && !sleeping) {
			armL.current.rotation.set(walking ? step * 0.4 * amount : 0, 0, 0.08);
			armR.current.rotation.set(-1.3, 0, 0);
		} else {
			const swing = sleeping ? 0 : step * 0.4 * amount;
			armL.current.rotation.set(swing, 0, 0.08);
			armR.current.rotation.set(-swing, 0, -0.08);
		}
		if (doll.current) doll.current.visible = v.prop === "doll" && !sleeping;
		if (lantern.current) {
			setShown(lantern.current, v.prop === "skull" && !sleeping);
		}
		if (magic.current) setShown(magic.current, currentSample.magic > 0.01);
		// ночью героиню мягко высвечивает «лунный луч» — иначе её не видно в чаще
		if (moonlight.current) {
			moonlight.current.intensity =
				paletteAt(currentSample.timeOfDay).night * 3;
		}
	});

	return (
		<group ref={root}>
			<group ref={body}>
				{/* сарафан */}
				<mesh position={[0, 0.48, 0]} castShadow>
					<cylinderGeometry args={[0.16, 0.34, 0.96, 14]} />
					<meshStandardMaterial color={SARAFAN} roughness={0.85} />
				</mesh>
				{/* рубаха */}
				<mesh position={[0, 1.08, 0]} castShadow>
					<cylinderGeometry args={[0.13, 0.16, 0.26, 12]} />
					<meshStandardMaterial color={BLOUSE} roughness={0.9} />
				</mesh>
				<mesh position={[0, 1.24, 0]}>
					<cylinderGeometry args={[0.04, 0.05, 0.08, 8]} />
					<meshStandardMaterial color={SKIN} roughness={0.8} />
				</mesh>
				{/* голова, глаза, волосы, лента и коса */}
				<mesh position={[0, 1.36, 0]} castShadow>
					<sphereGeometry args={[0.105, 16, 12]} />
					<meshStandardMaterial color={SKIN} roughness={0.75} />
				</mesh>
				{[-1, 1].map((side) => (
					<mesh key={side} position={[side * 0.035, 1.375, 0.093]}>
						<sphereGeometry args={[0.012, 8, 6]} />
						<meshStandardMaterial color="#2a1d14" roughness={0.4} />
					</mesh>
				))}
				<mesh position={[0, 1.385, -0.012]} scale={[1.06, 1, 1.08]}>
					<sphereGeometry
						args={[0.108, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
					/>
					<meshStandardMaterial color={HAIR} roughness={0.9} />
				</mesh>
				<mesh position={[0, 1.42, 0]} rotation-x={-0.25}>
					<torusGeometry args={[0.105, 0.012, 6, 24]} />
					<meshStandardMaterial color="#c8463a" roughness={0.8} />
				</mesh>
				<mesh position={[0, 1.08, -0.12]} rotation-x={0.12} castShadow>
					<cylinderGeometry args={[0.03, 0.02, 0.5, 8]} />
					<meshStandardMaterial color={HAIR} roughness={0.9} />
				</mesh>
				<group ref={armL} position={[-0.17, SHOULDER_Y, 0]}>
					<Arm side={-1} />
				</group>
				<group ref={armR} position={[0.17, SHOULDER_Y, 0]}>
					<Arm side={1} />
				</group>
				<group ref={doll} position={[0, 0.9, 0.3]}>
					<Doll />
				</group>
				<group ref={lantern} position={[0.19, 0.55, 0.43]}>
					<SkullLantern length={1.4} />
				</group>
			</group>
			<pointLight
				ref={moonlight}
				position={[0.4, 2.6, 0.8]}
				color="#9fb6ff"
				distance={5}
				decay={1.6}
			/>
			{/* куколка рядом со спящей Василисой */}
			<group ref={magic} position={[0.5, 0, -0.1]}>
				<DollMagic />
			</group>
		</group>
	);
}
