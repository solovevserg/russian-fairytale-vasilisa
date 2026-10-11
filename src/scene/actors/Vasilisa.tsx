import {useGLTF} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import {useMemo, useRef} from "react";
import type {Group, PointLight} from "three";

import {debugFlags} from "../../debugFlags";
import {currentSample, sceneProgress} from "../../story/currentSample";
import {createHeroineMotion} from "../../story/heroineMotion";
import {enableShadows, MODEL_URLS} from "../models";
import MODEL_META from "../models.meta.json" with {type: "json"};
import {paletteAt} from "../sky/timeOfDay";
import {heightAt} from "../terrain";
import {setShown} from "./presence";
import {Doll, DollMagic, SkullLantern} from "./props";

/**
 * Модель «Red Slavic Folk Dress» (akot777, CC-BY 4.0), раскрашена и упрощена
 * в scripts/prepare-models.ts. В исходнике 1.9 единицы роста, центр — в
 * середине фигуры, ось тела смещена на x ≈ 0.1, лицо смотрит в +Z.
 */
const HEIGHT = 1.5;
/** Габариты модели (scripts/prepare-models.ts): низ и рост в её единицах. */
const SOURCE_BOTTOM = MODEL_META.vasilisa.min[1];
const SOURCE_HEIGHT = MODEL_META.vasilisa.max[1] - SOURCE_BOTTOM;
const SCALE = HEIGHT / SOURCE_HEIGHT;
/** Ступни — на землю; по X ось фигуры (подобрано вручную), не центр габаритов. */
const MODEL_OFFSET: [number, number, number] = [
	-0.1 * SCALE,
	-SOURCE_BOTTOM * SCALE,
	0,
];
/**
 * Левая рука согнута и вынесена вперёд на уровень груди (замерено по вершинам
 * модели) — на эту ладонь и садится куколка. Лицо фигуры смотрит в +Z,
 * поэтому левая рука — со стороны +X.
 */
const LEFT_PALM: [number, number, number] = [0.226, 1.045, 0.2];
/**
 * Куколка колдует рядом со спящей, у её головы и плеча: −X — от стены избы
 * (на настиле, не у самого края — иначе висит в воздухе), чуть над досками.
 */
const DOLL_MAGIC_OFFSET: [number, number, number] = [-0.32, 0.08, 0.32];
/** Сцена «в начале», если её прогресс меньше этого (зачин при открытии). */
const AT_START = 0.02;
/**
 * Черты лица поверх модели (у неё нет текстуры, а вершин на лице мало, чтобы
 * нарисовать их цветом): в единицах исходной модели — лицо смотрит в +Z,
 * середина лица x ≈ 0.1, высота y = −0.951 + h · 1.899 (h — доля роста),
 * глубина z — по замерам поверхности лица (scripts: вершины модели).
 */
const FACE_Y = (h: number) => SOURCE_BOTTOM + h * SOURCE_HEIGHT;
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
	const {scene} = useGLTF(MODEL_URLS.vasilisa);
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
	const motion = useRef({x: 0, z: 0, phase: 0, speed: 0});
	const moonlight = useRef<PointLight>(null);
	/** Где она: таблица движений и таймлайн (story/heroineMotion.ts). */
	const heroine = useMemo(() => createHeroineMotion(debugFlags.instant), []);

	useFrame(({clock}, delta) => {
		const v = currentSample.vasilisa;
		const r = root.current;
		if (!r || !body.current) return;
		setShown(r, v.visible);
		const pose = heroine.step(
			v,
			clock.elapsedTime,
			delta,
			sceneProgress.value < AT_START,
		);
		if (!pose) {
			if (moonlight.current) moonlight.current.intensity = 0;
			return;
		}
		const {x, z, heading} = pose;

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
