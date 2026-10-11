import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, DoubleSide, type Group, Vector3 } from "three";
import { useStoryStore } from "../../state/storyStore";
import { sceneProgress } from "../../story/currentSample";
import { KEYFRAMES, RIDER_PATHS, type RiderColor } from "../../story/keyframes";
import { riderDuration, riderStarts } from "../../story/riderClock";
import { heightAt } from "../terrain";

const COLORS: Record<
	RiderColor,
	{ horse: string; rider: string; cloak: string }
> = {
	white: { horse: "#e9e6de", rider: "#f4f1ea", cloak: "#dcd8cc" },
	red: { horse: "#8e2a1e", rider: "#b3352a", cloak: "#7d1f16" },
	black: { horse: "#141312", rider: "#1b1a19", cloak: "#0d0c0c" },
};

const LEGS: [number, number, number][] = [
	// x, z, сдвиг фазы галопа
	[-0.17, 0.42, 0],
	[0.17, 0.42, 0.4],
	[-0.17, -0.42, 2.2],
	[0.17, -0.42, 2.6],
];

/** Конь с всадником — заглушка из примитивов, ~2.3 м в холке с всадником. */
function Rider({ color }: { color: RiderColor }) {
	const root = useRef<Group>(null);
	const legs = useRef<(Group | null)[]>([]);
	const run = useRef({ start: -1 });
	const palette = COLORS[color];
	const path = RIDER_PATHS[color];
	const chapterIndex = KEYFRAMES.findIndex((k) => k.rider === color);
	const duration = riderDuration(color);
	const curve = useMemo(
		() =>
			new CatmullRomCurve3(
				path.points.map((p) => new Vector3(...p)),
				false,
				"centripetal",
			),
		[path],
	);
	const point = useMemo(() => new Vector3(), []);
	const tangent = useMemo(() => new Vector3(), []);

	useFrame(({ clock }) => {
		const r = root.current;
		if (!r) return;
		const now = clock.elapsedTime;
		// всадник проносится один раз, когда сцена пришла в его главу
		// (а не когда к ней только начали листать); уйдёт из главы — сброс
		const offset = Math.abs(sceneProgress.value - chapterIndex);
		const here =
			offset < 0.05 && useStoryStore.getState().activeChapter === chapterIndex;
		if (here && run.current.start < 0) {
			run.current.start = now + path.delay;
			riderStarts[color] = run.current.start;
		} else if (offset > 0.5 && run.current.start >= 0) {
			run.current.start = -1;
			delete riderStarts[color];
		}
		const t = run.current.start < 0 ? -1 : (now - run.current.start) / duration;
		r.visible = t >= 0 && t <= 1;
		if (!r.visible) return;

		curve.getPointAt(t, point);
		curve.getTangentAt(t, tangent);
		const gallop = now * 11;
		r.position.set(
			point.x,
			heightAt(point.x, point.z) + Math.abs(Math.sin(gallop)) * 0.08,
			point.z,
		);
		r.rotation.set(
			Math.sin(gallop) * 0.04,
			Math.atan2(tangent.x, tangent.z),
			0,
		);
		legs.current.forEach((leg, i) => {
			if (leg) leg.rotation.x = Math.sin(gallop + LEGS[i][2]) * 0.75;
		});
	});

	return (
		<group ref={root} visible={false}>
			{/* конь */}
			<mesh position={[0, 1.2, 0]} rotation-x={Math.PI / 2} castShadow>
				<capsuleGeometry args={[0.3, 0.95, 6, 12]} />
				<meshStandardMaterial color={palette.horse} roughness={0.7} />
			</mesh>
			<mesh position={[0, 1.55, 0.72]} rotation-x={0.65} castShadow>
				<cylinderGeometry args={[0.11, 0.17, 0.7, 10]} />
				<meshStandardMaterial color={palette.horse} roughness={0.7} />
			</mesh>
			<mesh position={[0, 1.85, 0.98]} rotation-x={1.1} castShadow>
				<boxGeometry args={[0.18, 0.5, 0.2]} />
				<meshStandardMaterial color={palette.horse} roughness={0.7} />
			</mesh>
			<mesh position={[0, 1.3, -0.78]} rotation-x={-0.7}>
				<cylinderGeometry args={[0.04, 0.09, 0.6, 6]} />
				<meshStandardMaterial color={palette.cloak} roughness={1} />
			</mesh>
			{LEGS.map(([x, z], i) => (
				<group
					key={`${x}:${z}`}
					ref={(el) => {
						legs.current[i] = el;
					}}
					position={[x, 1.05, z]}
				>
					<mesh position={[0, -0.5, 0]} castShadow>
						<cylinderGeometry args={[0.06, 0.045, 1.0, 6]} />
						<meshStandardMaterial color={palette.horse} roughness={0.7} />
					</mesh>
				</group>
			))}
			{/* всадник */}
			<mesh position={[0, 1.85, 0.05]} castShadow>
				<cylinderGeometry args={[0.15, 0.2, 0.6, 10]} />
				<meshStandardMaterial color={palette.rider} roughness={0.8} />
			</mesh>
			<mesh position={[0, 2.27, 0.08]} castShadow>
				<sphereGeometry args={[0.12, 12, 10]} />
				<meshStandardMaterial color={palette.rider} roughness={0.8} />
			</mesh>
			<mesh position={[0, 1.8, -0.25]} rotation-x={0.5}>
				<planeGeometry args={[0.5, 0.8]} />
				<meshStandardMaterial
					color={palette.cloak}
					roughness={1}
					side={DoubleSide}
				/>
			</mesh>
		</group>
	);
}

/** Белый, красный и чёрный всадники — каждый в своей главе. */
export function Riders() {
	return (
		<>
			<Rider color="white" />
			<Rider color="red" />
			<Rider color="black" />
		</>
	);
}
