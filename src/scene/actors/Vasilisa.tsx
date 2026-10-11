import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, PointLight } from "three";
import { debugFlags } from "../../debugFlags";
import { currentSample, sceneProgress } from "../../story/currentSample";
import { departureAt } from "../../story/departure";
import {
	homecomingAt,
	homecomingClock,
	homecomingRoute,
} from "../../story/homecoming";
import { INTRO_TIME, introAt } from "../../story/intro";
import { enableShadows, MODEL_URLS } from "../models";
import { paletteAt } from "../sky/timeOfDay";
import { heightAt, pathFrame } from "../terrain";
import { setShown } from "./presence";
import { Doll, DollMagic, SkullLantern } from "./props";

/**
 * Модель «Red Slavic Folk Dress» (akot777, CC-BY 4.0), раскрашена и упрощена
 * в scripts/prepare-models.ts. В исходнике 1.9 единицы роста, центр — в
 * середине фигуры, ось тела смещена на x ≈ 0.1, лицо смотрит в +Z.
 */
const HEIGHT = 1.5;
const SOURCE_HEIGHT = 1.9;
const SCALE = HEIGHT / SOURCE_HEIGHT;
const MODEL_OFFSET: [number, number, number] = [-0.1 * SCALE, 0.95 * SCALE, 0];
/**
 * Левая рука согнута и вынесена вперёд на уровень груди (замерено по вершинам
 * модели) — на эту ладонь и садится куколка. Лицо фигуры смотрит в +Z,
 * поэтому левая рука — со стороны +X.
 */
const LEFT_PALM: [number, number, number] = [0.226, 1.045, 0.2];
/**
 * Куколка колдует рядом со спящей: −X — от стены избы, к переднему краю
 * крыльца (ближе к камере), и парит над настилом — не задевает доски.
 */
const DOLL_MAGIC_OFFSET: [number, number, number] = [-0.42, 0.2, 0.12];
/** Как медленно идёт дальше, дойдя до кадра (onward), м/с. */
const ONWARD_SPEED = 0.35;
/**
 * Черты лица поверх модели (у неё нет текстуры, а вершин на лице мало, чтобы
 * нарисовать их цветом): в единицах исходной модели — лицо смотрит в +Z,
 * середина лица x ≈ 0.1, высота y = −0.951 + h · 1.899 (h — доля роста),
 * глубина z — по замерам поверхности лица (scripts: вершины модели).
 */
const FACE_Y = (h: number) => -0.951 + h * 1.899;
const EYES: [number, number, number][] = [
	[0.068, FACE_Y(0.915), 0.088],
	[0.132, FACE_Y(0.915), 0.088],
];
const BROWS: [number, number, number, number][] = [
	// x, y, z, наклон
	[0.066, FACE_Y(0.929), 0.093, 0.15],
	[0.134, FACE_Y(0.929), 0.093, -0.15],
];
const MOUTH: [number, number, number] = [0.1, FACE_Y(0.877), 0.088];

/** Глаза, брови и губы — маленькие приплюснутые сферы на поверхности лица. */
function Face() {
	return (
		<group>
			{EYES.map((p) => (
				<group key={p[0]} position={p}>
					{/* белок и радужка */}
					<mesh scale={[1.7, 1, 0.45]}>
						<sphereGeometry args={[0.0085, 12, 8]} />
						<meshStandardMaterial color="#f2ece2" roughness={0.4} />
					</mesh>
					<mesh position={[0, -0.001, 0.0035]} scale={[1, 1, 0.4]}>
						<sphereGeometry args={[0.0065, 12, 8]} />
						<meshStandardMaterial color="#3b5a7a" roughness={0.3} />
					</mesh>
					<mesh position={[0, -0.001, 0.0055]} scale={[1, 1, 0.4]}>
						<sphereGeometry args={[0.0032, 10, 6]} />
						<meshStandardMaterial color="#141010" roughness={0.2} />
					</mesh>
					{/* веко-ресницы сверху */}
					<mesh position={[0, 0.0075, 0.002]} scale={[1.9, 0.35, 0.5]}>
						<sphereGeometry args={[0.0085, 12, 6]} />
						<meshStandardMaterial color="#3a2414" roughness={0.8} />
					</mesh>
				</group>
			))}
			{BROWS.map(([x, y, z, tilt]) => (
				<mesh
					key={x}
					position={[x, y, z]}
					rotation-z={tilt}
					scale={[2.6, 0.45, 0.5]}
				>
					<sphereGeometry args={[0.0085, 12, 6]} />
					<meshStandardMaterial color="#6e4a26" roughness={0.9} />
				</mesh>
			))}
			{/* губы: верхняя и нижняя */}
			<group position={MOUTH}>
				<mesh position={[0, 0.0028, 0]} scale={[2.2, 0.55, 0.6]}>
					<sphereGeometry args={[0.0075, 12, 6]} />
					<meshStandardMaterial color="#b4504a" roughness={0.5} />
				</mesh>
				<mesh position={[0, -0.0028, 0.0005]} scale={[1.9, 0.7, 0.65]}>
					<sphereGeometry args={[0.0075, 12, 6]} />
					<meshStandardMaterial color="#c4605a" roughness={0.45} />
				</mesh>
			</group>
		</group>
	);
}

/** Где палка черепа-светоча проходит через руку. */
const LANTERN_GRIP: [number, number, number] = [0.22, 1.0, 0.05];

/**
 * Василиса: положение, поворот, поза (идёт / стоит / спит) и предмет в руке —
 * из таймлайна. Модель без скелета, поэтому шаг передаём покачиванием.
 */
export function Vasilisa() {
	const { scene } = useGLTF(MODEL_URLS.vasilisa);
	const model = useMemo(() => {
		const clone = scene.clone(true);
		enableShadows(clone);
		// тени от крон на героине не нужны: в «Восходе» солнце должно освещать лицо
		clone.traverse((child) => {
			child.receiveShadow = false;
		});
		return clone;
	}, [scene]);

	const root = useRef<Group>(null);
	const body = useRef<Group>(null);
	const doll = useRef<Group>(null);
	const lantern = useRef<Group>(null);
	const magic = useRef<Group>(null);
	const motion = useRef({ x: 0, z: 0, phase: 0, speed: 0 });
	const moonlight = useRef<PointLight>(null);
	const departure = useRef({ start: -1, x: 0, z: 0, heading: 0 });
	const homecoming = useRef({ x: 0, z: 0, heading: 0, walked: 0 });
	/** Зачин: выход из-за избы при открытии сайта (start < 0 — ещё не начат). */
	const intro = useRef({
		start: -1,
		done: debugFlags.instant,
		x: 0,
		z: 0,
		heading: 0,
	});
	/** Дошла до кадра и идёт дальше (onward): с какого времени. */
	const onward = useRef(-1);
	/** Сглаживание скачков (например, листнули, пока она шла дальше), м. */
	const jump = useRef({ x: 0, z: 0 });
	/** В прошлом кадре шла дальше (onward) или выходила из-за избы. */
	const wasSpecial = useRef(false);
	/** Где героиня была в прошлом кадре (null — не была видна). */
	const last = useRef<{ x: number; z: number; heading: number } | null>(null);

	useFrame(({ clock }, delta) => {
		const v = currentSample.vasilisa;
		const r = root.current;
		if (!r || !body.current) return;
		setShown(r, v.visible);
		if (!v.visible) last.current = null;
		if (!v.visible) {
			if (moonlight.current) moonlight.current.intensity = 0;
			return;
		}

		// «Череп-светоч»: уход по тропе идёт по часам с входа в главу
		const d = departure.current;
		const leaving = v.pose === "leave";
		if (leaving) {
			if (d.start < 0) d.start = clock.elapsedTime;
			departureAt(clock.elapsedTime - d.start, [v.x, v.z], v.heading, d);
		} else {
			d.start = -1;
		}

		// «Эпилог»: дальше по тропе с того места, где она сейчас, и вокруг избы
		const h = homecoming.current;
		const home = homecomingClock;
		const returning = v.pose === "return";
		if (returning) {
			if (home.start < 0) {
				const from = last.current ?? { x: v.x, z: v.z, heading: v.heading };
				home.start = clock.elapsedTime;
				home.route = homecomingRoute([from.x, from.z], from.heading);
			}
			if (home.route)
				homecomingAt(home.route, clock.elapsedTime - home.start, h);
		} else {
			home.start = -1;
		}

		// зачин: только при открытии на прологе, один раз; листнули — сразу в кадр главы
		const it = intro.current;
		if (!it.done) {
			const atStart = sceneProgress.value < 0.02;
			if (it.start < 0) {
				if (atStart) it.start = clock.elapsedTime;
				else it.done = true;
			}
			const t = clock.elapsedTime - it.start;
			if (!atStart || t > INTRO_TIME) it.done = true;
			else introAt(t, v.heading, it);
		}
		const entering = !it.done;

		// дошла до кадра — медленно идёт дальше по тропе (onward)
		let vx = v.x;
		let vz = v.z;
		if (v.onward > 0 && !Number.isNaN(v.path)) {
			if (onward.current < 0) onward.current = clock.elapsedTime;
			const k = Math.min(
				(clock.elapsedTime - onward.current) / (v.onward / ONWARD_SPEED),
				1,
			);
			// шаг понемногу затихает
			const f = pathFrame(v.path - v.onward * (1 - (1 - k) * (1 - k)));
			const dx = v.x - pathFrame(v.path).x;
			const dz = v.z - pathFrame(v.path).z;
			vx = f.x + dx;
			vz = f.z + dz;
		} else {
			onward.current = -1;
		}

		let x = entering ? it.x : leaving ? d.x : returning ? h.x : vx;
		let z = entering ? it.z : leaving ? d.z : returning ? h.z : vz;
		// листнули, пока она шла дальше (onward) или выходила из-за избы, —
		// разовый скачок к положению по таймлайну: догоняет его плавно
		const special = entering || onward.current >= 0;
		const jx = jump.current;
		const shown = last.current;
		if (wasSpecial.current && !special && shown) {
			const gap = Math.hypot(shown.x - x, shown.z - z);
			if (gap < 3) {
				jx.x = shown.x - x;
				jx.z = shown.z - z;
			}
		}
		wasSpecial.current = special;
		const decay = Math.exp(-Math.min(delta, 0.1) * 3);
		jx.x *= decay;
		jx.z *= decay;
		x += jx.x;
		z += jx.z;
		const heading = entering
			? it.heading
			: leaving
				? d.heading
				: returning
					? h.heading
					: v.heading;
		last.current = { x, z, heading };

		// скорость — по смещению за кадр, сглаженная
		const m = motion.current;
		const dt = Math.max(delta, 1e-3);
		const speed = Math.hypot(x - m.x, z - m.z) / dt;
		m.speed += (Math.min(speed, 3) - m.speed) * Math.min(dt * 6, 1);
		m.x = x;
		m.z = z;
		const sleeping = v.pose === "sleep";
		const walking = !sleeping && m.speed > 0.08;
		m.phase += dt * (walking ? 4 + m.speed * 2 : 0);

		r.position.set(x, heightAt(x, z) + v.elevation, z);
		r.rotation.y = heading;

		// шаг: лёгкое покачивание и подпрыгивание; во сне — лежит на спине
		const step = Math.sin(m.phase);
		const amount = Math.min(m.speed / 0.6, 1);
		body.current.rotation.set(
			sleeping ? -Math.PI / 2 : 0,
			0,
			walking ? step * 0.035 * amount : 0,
		);
		body.current.position.set(
			0,
			sleeping ? 0.3 : Math.abs(step) * 0.03 * amount,
			sleeping ? 0.75 : 0,
		);

		if (doll.current) doll.current.visible = v.prop === "doll" && !sleeping;
		if (lantern.current)
			setShown(lantern.current, v.prop === "skull" && !sleeping);
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
				<group scale={SCALE} position={MODEL_OFFSET}>
					<primitive object={model} />
					<Face />
				</group>
				<group ref={doll} position={LEFT_PALM}>
					<Doll />
				</group>
				{/* череп-светоч: палка проходит через кисть */}
				<group
					ref={lantern}
					position={[
						LANTERN_GRIP[0],
						LANTERN_GRIP[1] - 0.45,
						LANTERN_GRIP[2] + 0.02,
					]}
				>
					<SkullLantern length={1.4} beams />
				</group>
			</group>
			<pointLight
				ref={moonlight}
				position={[0.4, 2.6, 0.8]}
				color="#9fb6ff"
				distance={5}
				decay={1.6}
			/>
			{/* куколка стоит перед спящей Василисой (снаружи, у края крыльца) */}
			<group ref={magic} position={DOLL_MAGIC_OFFSET}>
				<DollMagic />
			</group>
		</group>
	);
}
