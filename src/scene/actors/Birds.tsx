import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	BufferGeometry,
	DoubleSide,
	Float32BufferAttribute,
	type InstancedMesh,
	Matrix4,
	type Mesh,
	Object3D,
} from "three";

import { createRandom } from "../../lib/random";
import { currentSample } from "../../story/currentSample";
import { MODEL_URLS } from "../models";
import { paletteAt } from "../sky/timeOfDay";

const COUNT = 16;
const COLOR = "#1d1b19";

interface Bird {
	radius: number;
	height: number;
	speed: number;
	phase: number;
	flapRate: number;
	/** Размах взмаха и своя фаза ритма планирования — у каждой птицы свои. */
	flapAmount: number;
	glidePhase: number;
	glideRate: number;
	centerX: number;
	centerZ: number;
	direction: 1 | -1;
}

/** Полуширина тела птицы, м: дальше от оси — крылья (машут у «плеча»). */
const BODY_HALF = 0.09;

/**
 * Модель птицы (Poly by Google, крылья раскинуты) — на тело и два крыла по
 * центрам треугольников; крылья сдвинуты так, что «плечо» — в нуле.
 */
function splitBird(source: BufferGeometry): {
	body: BufferGeometry;
	left: BufferGeometry;
	right: BufferGeometry;
} {
	const g = source.index ? source.toNonIndexed() : source.clone();
	const pos = g.getAttribute("position");
	const parts = {
		body: [] as number[],
		left: [] as number[],
		right: [] as number[],
	};
	for (let i = 0; i < pos.count; i += 3) {
		const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
		const part = cx > BODY_HALF ? "right" : cx < -BODY_HALF ? "left" : "body";
		const shift =
			part === "right" ? BODY_HALF : part === "left" ? -BODY_HALF : 0;
		for (let k = 0; k < 3; k++)
			parts[part].push(
				pos.getX(i + k) - shift,
				pos.getY(i + k),
				pos.getZ(i + k),
			);
	}
	const make = (array: number[]) => {
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new Float32BufferAttribute(array, 3));
		geometry.computeVertexNormals();
		return geometry;
	};
	return {
		body: make(parts.body),
		left: make(parts.left),
		right: make(parts.right),
	};
}

/**
 * Стая птиц (вороны/грачи) кружит над лесом. Тёмные силуэты читаются
 * при любом свете; ночью стая улетает (масштаб → 0).
 */
export function Birds() {
	const birds = useMemo<Bird[]>(() => {
		const random = createRandom(2024);
		// половина стаи кружит низко над поляной (там нет деревьев), половина — высоко над лесом
		return Array.from({ length: COUNT }, (_, i) => ({
			radius: i % 2 ? 6 + random() * 5 : 22 + random() * 22,
			height: i % 2 ? 10 + random() * 6 : 28 + random() * 8,
			speed: 5 + random() * 3,
			phase: random() * Math.PI * 2,
			flapRate: 6 + random() * 6,
			flapAmount: 0.45 + random() * 0.3,
			glidePhase: random() * 100,
			glideRate: 0.25 + random() * 0.5,
			centerX: i % 2 ? 0 : (random() - 0.5) * 20,
			centerZ: i % 2 ? 0 : (random() - 0.5) * 20,
			direction: random() < 0.75 ? 1 : -1,
		}));
	}, []);
	const { scene } = useGLTF(MODEL_URLS.bird);
	const { body, left, right } = useMemo(() => {
		let geometry: BufferGeometry | null = null;
		scene.updateMatrixWorld(true);
		scene.traverse((child) => {
			const mesh = child as Mesh;
			if (mesh.isMesh && !geometry)
				geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
		});
		return splitBird(geometry ?? new BufferGeometry());
	}, [scene]);
	const bodies = useRef<InstancedMesh>(null);
	const leftWings = useRef<InstancedMesh>(null);
	const rightWings = useRef<InstancedMesh>(null);
	const temp = useMemo(
		() => ({
			dummy: new Object3D(),
			wing: new Matrix4(),
			base: new Matrix4(),
			shoulder: new Matrix4(),
		}),
		[],
	);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const night = paletteAt(currentSample.timeOfDay).night;
		const presence = Math.max(0, 1 - Math.max(0, night - 0.5) * 2.5);
		const { dummy, wing, base, shoulder } = temp;
		birds.forEach((b, i) => {
			const angle = b.phase + (b.direction * t * b.speed) / b.radius;
			const x = b.centerX + Math.cos(angle) * b.radius;
			const z = b.centerZ + Math.sin(angle) * b.radius;
			const y = b.height + Math.sin(t * 0.4 + b.phase) * 2.5;
			// касательная к окружности — направление полёта
			const heading = Math.atan2(
				-Math.sin(angle) * b.direction,
				Math.cos(angle) * b.direction,
			);
			dummy.position.set(x, y, z);
			dummy.rotation.set(0, heading, -0.25 * b.direction);
			dummy.scale.setScalar(presence);
			dummy.updateMatrix();
			base.copy(dummy.matrix);
			bodies.current?.setMatrixAt(i, base);

			// машет крыльями, время от времени планирует
			// ритм у каждой свой: частота чуть «плавает», планирование — в своё время
			const gliding =
				Math.sin(t * b.glideRate + b.glidePhase) +
					0.5 * Math.sin(t * b.glideRate * 2.3 + b.glidePhase * 1.7) >
				0.9;
			const beat =
				t * b.flapRate + b.phase + 0.6 * Math.sin(t * 0.7 + b.glidePhase);
			const flap = gliding ? 0.08 : Math.sin(beat) * b.flapAmount;
			// без новых матриц в каждом кадре — одна рабочая на все крылья
			// крыло поворачивается у «плеча» — на краю тела
			wing.makeRotationZ(flap);
			shoulder.makeTranslation(-BODY_HALF, 0, 0).premultiply(base);
			wing.premultiply(shoulder);
			leftWings.current?.setMatrixAt(i, wing);
			wing.makeRotationZ(-flap);
			shoulder.makeTranslation(BODY_HALF, 0, 0).premultiply(base);
			wing.premultiply(shoulder);
			rightWings.current?.setMatrixAt(i, wing);
		});
		for (const mesh of [
			bodies.current,
			leftWings.current,
			rightWings.current,
		]) {
			if (mesh) mesh.instanceMatrix.needsUpdate = true;
		}
	});

	return (
		<group>
			<instancedMesh
				ref={bodies}
				args={[body, undefined, COUNT]}
				frustumCulled={false}
			>
				<meshStandardMaterial color={COLOR} roughness={0.9} side={DoubleSide} />
			</instancedMesh>
			<instancedMesh
				ref={leftWings}
				args={[left, undefined, COUNT]}
				frustumCulled={false}
			>
				<meshStandardMaterial color={COLOR} roughness={1} side={DoubleSide} />
			</instancedMesh>
			<instancedMesh
				ref={rightWings}
				args={[right, undefined, COUNT]}
				frustumCulled={false}
			>
				<meshStandardMaterial color={COLOR} roughness={1} side={DoubleSide} />
			</instancedMesh>
		</group>
	);
}
