import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
	AnimationMixer,
	CatmullRomCurve3,
	DoubleSide,
	type Group,
	LatheGeometry,
	type Object3D,
	type PointLight,
	Vector2,
	Vector3,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { currentSample } from "../../story/currentSample";
import { BABA_YAGA_FLIGHT, BABA_YAGA_STAND } from "../../story/keyframes";
import { enableShadows, MODEL_URLS } from "../models";
import { heightAt } from "../terrain";
import { setShown } from "./presence";
import { SkullLantern } from "./props";

const WOOD = "#6b4a2e";

/**
 * Модель «Witch» (MAXDESIGN, CC-BY 4.0): ~1.02 единицы роста, смотрит в +Z,
 * клюка в правой руке. Анимация «Take 001» — спокойное покачивание.
 */
const WITCH_HEIGHT = 1.02;
const STAND_SCALE = 1.5 / WITCH_HEIGHT;
/** Верх клюки в координатах модели — туда насаживаем череп. */
const STAFF_TOP: [number, number, number] = [-0.17, 0.95, 0.03];

/** Полёт: заходит высоко с края неба, виражом снижается, пролетает мимо камеры и садится у избы. */
const FLIGHT = new CatmullRomCurve3(
	BABA_YAGA_FLIGHT.map((p) => new Vector3(...p)),
	false,
	"centripetal",
);
const FLIGHT_TIME = 10;
/** Крен на вираже: радиан на радиан поворота курса за шаг выборки. */
const BANK = 9;
const MAX_BANK = 0.75;

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

/** Экземпляр модели со своим скелетом и проигрывателем анимации. */
function useWitch(): { object: Object3D; mixer: AnimationMixer } {
	const { scene, animations } = useGLTF(MODEL_URLS.babaYaga);
	const witch = useMemo(() => {
		const object = cloneSkinned(scene);
		enableShadows(object);
		const mixer = new AnimationMixer(object);
		if (animations[0]) mixer.clipAction(animations[0]).play();
		return { object, mixer };
	}, [scene, animations]);
	useEffect(
		() => () => {
			witch.mixer.stopAllAction();
		},
		[witch],
	);
	return witch;
}

/** Курс (поворот вокруг Y) касательной. */
function heading(v: Vector3) {
	return Math.atan2(v.x, v.z);
}

/**
 * Баба Яга. Глава «Баба Яга»: летит в ступе, пестом погоняет, помелом след
 * заметает — и виражом снижается к избушке. Глава «Череп-светоч»: стоит у
 * избы и протягивает Василисе череп, насаженный на клюку.
 */
export function BabaYaga() {
	const flyingWitch = useWitch();
	const standingWitch = useWitch();
	const flying = useRef<Group>(null);
	const standing = useRef<Group>(null);
	const pestle = useRef<Group>(null);
	const glow = useRef<PointLight>(null);
	const flightStart = useRef(-1);
	const tangent = useMemo(() => new Vector3(), []);
	const ahead = useMemo(() => new Vector3(), []);

	useFrame(({ clock }, delta) => {
		const mode = currentSample.babaYaga;
		const now = clock.elapsedTime;
		if (standing.current) setShown(standing.current, mode === "stand");
		if (mode === "stand") standingWitch.mixer.update(delta);
		const f = flying.current;
		if (!f) return;
		if (mode !== "fly") {
			setShown(f, false);
			if (glow.current) glow.current.intensity = 0;
			flightStart.current = -1;
			return;
		}
		// полёт однократный: запускается при входе в главу и заканчивается
		// посадкой у избушки; при повторном входе в главу — заново
		if (flightStart.current < 0) flightStart.current = now;
		const t = Math.min((now - flightStart.current) / FLIGHT_TIME, 1);
		setShown(f, true);
		if (glow.current) glow.current.intensity = 30;
		flyingWitch.mixer.update(delta);

		// к концу пути — плавно выравниваемся и встаём на землю
		const landing = Math.min(Math.max((t - 0.82) / 0.18, 0), 1);
		const settle = 1 - landing * landing * (3 - 2 * landing);
		FLIGHT.getPointAt(t, f.position);
		f.position.y +=
			Math.sin(now * 2.3) * 0.2 * settle +
			heightAt(f.position.x, f.position.z) * (1 - settle);
		FLIGHT.getTangentAt(Math.min(t, 0.95), tangent);
		FLIGHT.getTangentAt(Math.min(t + 0.02, 0.97), ahead);
		// крен — в сторону поворота, тангаж — носом вниз на снижении
		const turn = Math.atan2(
			Math.sin(heading(ahead) - heading(tangent)),
			Math.cos(heading(ahead) - heading(tangent)),
		);
		const roll = Math.max(-MAX_BANK, Math.min(MAX_BANK, -turn * BANK));
		const pitch = Math.asin(Math.max(-1, Math.min(1, -tangent.y))) * 0.8;
		f.rotation.set(
			pitch * settle,
			heading(tangent),
			(roll + Math.sin(now * 1.7) * 0.06) * settle,
			"YXZ",
		);
		// пестом погоняет
		if (pestle.current)
			pestle.current.rotation.x = -0.5 + Math.sin(now * 3) * 0.35;
	});

	const standY = heightAt(BABA_YAGA_STAND.x, BABA_YAGA_STAND.z);

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
				<primitive object={flyingWitch.object} scale={1.2} position-y={0.2} />
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
			<group
				ref={standing}
				position={[BABA_YAGA_STAND.x, standY, BABA_YAGA_STAND.z]}
			>
				<primitive object={standingWitch.object} scale={STAND_SCALE} />
				{/* череп со светящимися глазами — на верхушке её клюки */}
				<group
					position={
						STAFF_TOP.map((v) => v * STAND_SCALE) as [number, number, number]
					}
				>
					<SkullLantern stick={false} />
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
