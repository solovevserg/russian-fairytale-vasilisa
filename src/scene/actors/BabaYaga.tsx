import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	DoubleSide,
	type Group,
	LatheGeometry,
	type PointLight,
	QuadraticBezierCurve3,
	Vector2,
	Vector3,
} from "three";
import { currentSample } from "../../story/currentSample";
import { BABA_YAGA_FLIGHT, BABA_YAGA_STAND } from "../../story/keyframes";
import { heightAt } from "../terrain";
import { setShown } from "./presence";
import { SkullLantern } from "./props";

const SKIN = "#c9a98a";
const ROBE = "#3b3328";
const SHAWL = "#5a1f1a";
const WOOD = "#6b4a2e";

/** Полёт по небу: дуга над поляной, ~8 с пролёт и пауза. */
const FLIGHT = new QuadraticBezierCurve3(
	...(BABA_YAGA_FLIGHT.map((p) => new Vector3(...p)) as [
		Vector3,
		Vector3,
		Vector3,
	]),
);
const FLIGHT_TIME = 8;
const FLIGHT_PAUSE = 2.5;
const STAND_AT = BABA_YAGA_STAND;

function Mortar() {
	const geometry = useMemo(
		() =>
			new LatheGeometry(
				[
					new Vector2(0, 0),
					new Vector2(0.3, 0),
					new Vector2(0.36, 0.1),
					new Vector2(0.42, 0.75),
					new Vector2(0.38, 0.8),
					new Vector2(0.33, 0.3),
				],
				18,
			),
		[],
	);
	return (
		<mesh geometry={geometry} castShadow>
			<meshStandardMaterial color={WOOD} roughness={0.95} side={DoubleSide} />
		</mesh>
	);
}

/** Сгорбленная старуха: балахон, платок, длинный нос. */
function Figure({ armForward = false }: { armForward?: boolean }) {
	return (
		<group>
			<mesh position={[0, 0.55, 0]} castShadow>
				<coneGeometry args={[0.32, 1.1, 12]} />
				<meshStandardMaterial color={ROBE} roughness={1} />
			</mesh>
			<group position={[0, 1.15, 0.1]} rotation-x={0.35}>
				<mesh castShadow>
					<sphereGeometry args={[0.12, 14, 10]} />
					<meshStandardMaterial color={SKIN} roughness={0.85} />
				</mesh>
				<mesh position={[0, 0.03, -0.01]} scale={[1.15, 1.1, 1.2]}>
					<sphereGeometry
						args={[0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]}
					/>
					<meshStandardMaterial color={SHAWL} roughness={1} />
				</mesh>
				<mesh position={[0, -0.01, 0.15]} rotation-x={Math.PI / 2 + 0.3}>
					<coneGeometry args={[0.025, 0.12, 8]} />
					<meshStandardMaterial color={SKIN} roughness={0.85} />
				</mesh>
				{[-1, 1].map((side) => (
					<mesh key={side} position={[side * 0.04, 0.03, 0.105]}>
						<sphereGeometry args={[0.013, 8, 6]} />
						<meshBasicMaterial color="#e6c040" />
					</mesh>
				))}
			</group>
			{/* правая рука: вперёд (протягивает череп) или вниз к песту */}
			<group
				position={[0.2, 0.95, 0.05]}
				rotation-x={armForward ? -1.35 : -0.6}
			>
				<mesh position={[0, -0.22, 0]}>
					<cylinderGeometry args={[0.05, 0.04, 0.45, 8]} />
					<meshStandardMaterial color={ROBE} roughness={1} />
				</mesh>
			</group>
			<group position={[-0.2, 0.95, 0.05]} rotation-x={-0.5}>
				<mesh position={[0, -0.22, 0]}>
					<cylinderGeometry args={[0.05, 0.04, 0.45, 8]} />
					<meshStandardMaterial color={ROBE} roughness={1} />
				</mesh>
			</group>
		</group>
	);
}

function Broom() {
	return (
		<group>
			<mesh position={[0, 0.7, 0]}>
				<cylinderGeometry args={[0.02, 0.02, 1.4, 6]} />
				<meshStandardMaterial color={WOOD} roughness={1} />
			</mesh>
			<mesh position={[0, -0.1, 0]} rotation-x={Math.PI}>
				<coneGeometry args={[0.16, 0.5, 10, 1, true]} />
				<meshStandardMaterial color="#8a7240" roughness={1} side={DoubleSide} />
			</mesh>
		</group>
	);
}

/**
 * Баба Яга — заглушка из примитивов. Глава «Баба Яга»: летит в ступе,
 * пестом погоняет, помелом след заметает. Глава «Череп-светоч»: стоит у избы
 * и протягивает Василисе череп на палке.
 */
export function BabaYaga() {
	const flying = useRef<Group>(null);
	const standing = useRef<Group>(null);
	const pestle = useRef<Group>(null);
	const glow = useRef<PointLight>(null);
	const flightStart = useRef(-1);
	const tangent = useMemo(() => new Vector3(), []);

	useFrame(({ clock }) => {
		const mode = currentSample.babaYaga;
		const now = clock.elapsedTime;
		if (standing.current) setShown(standing.current, mode === "stand");
		const f = flying.current;
		if (!f) return;
		if (mode !== "fly") {
			setShown(f, false);
			if (glow.current) glow.current.intensity = 0;
			flightStart.current = -1;
			return;
		}
		if (flightStart.current < 0) flightStart.current = now;
		const t =
			((now - flightStart.current) % (FLIGHT_TIME + FLIGHT_PAUSE)) /
			FLIGHT_TIME;
		setShown(f, t <= 1);
		if (glow.current) glow.current.intensity = t <= 1 ? 30 : 0;
		if (t > 1) return;
		FLIGHT.getPoint(t, f.position);
		f.position.y += Math.sin(now * 2.3) * 0.25;
		FLIGHT.getTangent(t, tangent);
		f.rotation.set(
			0.15,
			Math.atan2(tangent.x, tangent.z),
			Math.sin(now * 1.7) * 0.12,
		);
		// пестом погоняет
		if (pestle.current)
			pestle.current.rotation.x = -0.5 + Math.sin(now * 3) * 0.35;
	});

	const standY = heightAt(STAND_AT.x, STAND_AT.z);

	return (
		<>
			<group ref={flying} scale={2}>
				{/* подсветка, чтобы тёмная фигура читалась на ночном небе */}
				<pointLight
					ref={glow}
					position={[0.8, 2, 1.2]}
					color="#b8c8ff"
					distance={8}
					decay={1.5}
				/>
				<Mortar />
				<group position={[0, 0.3, 0]}>
					<Figure />
				</group>
				<group ref={pestle} position={[0.3, 1.0, 0.1]}>
					<mesh position={[0, 0.2, 0]}>
						<cylinderGeometry args={[0.035, 0.05, 1.5, 8]} />
						<meshStandardMaterial color={WOOD} roughness={1} />
					</mesh>
				</group>
				{/* помелом след заметает — помело волочится позади */}
				<group position={[-0.3, 0.6, -0.5]} rotation-x={-1.1}>
					<Broom />
				</group>
			</group>
			<group ref={standing} position={[STAND_AT.x, standY, STAND_AT.z]}>
				<Figure armForward />
				{/* череп на палке в вытянутой руке, к Василисе */}
				<group position={[0.22, 0.55, 0.42]} rotation-x={0.45}>
					<SkullLantern length={1.3} />
				</group>
				<group position={[-0.9, 0, -0.3]}>
					<Mortar />
				</group>
				<group position={[-1.3, 0, -0.5]} rotation-z={0.3}>
					<Broom />
				</group>
			</group>
		</>
	);
}
