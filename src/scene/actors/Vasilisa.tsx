import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, PointLight } from "three";
import { currentSample } from "../../story/currentSample";
import { departureAt } from "../../story/departure";
import { enableShadows, MODEL_URLS } from "../models";
import { paletteAt } from "../sky/timeOfDay";
import { heightAt } from "../terrain";
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
/** Правая кисть (где была веточка) в координатах фигуры. */
const RIGHT_HAND: [number, number, number] = [0.22, 1.0, 0.05];

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

	useFrame(({ clock }, delta) => {
		const v = currentSample.vasilisa;
		const r = root.current;
		if (!r || !body.current) return;
		setShown(r, v.visible);
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
		const x = leaving ? d.x : v.x;
		const z = leaving ? d.z : v.z;

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
		r.rotation.y = leaving ? d.heading : v.heading;

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
				<primitive object={model} scale={SCALE} position={MODEL_OFFSET} />
				<group ref={doll} position={RIGHT_HAND}>
					<Doll />
				</group>
				{/* череп-светоч: палка проходит через кисть */}
				<group
					ref={lantern}
					position={[RIGHT_HAND[0], RIGHT_HAND[1] - 0.45, RIGHT_HAND[2] + 0.02]}
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
			<group ref={magic} position={[-0.5, 0, 0.1]}>
				<DollMagic />
			</group>
		</group>
	);
}
