import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	BufferGeometry,
	DoubleSide,
	Float32BufferAttribute,
	type InstancedMesh,
	Matrix4,
	Object3D,
} from "three";
import { currentSample } from "../../story/currentSample";
import { createRandom } from "../random";
import { paletteAt } from "../sky/timeOfDay";

const COUNT = 16;
const COLOR = "#1d1b19";

interface Bird {
	radius: number;
	height: number;
	speed: number;
	phase: number;
	flapRate: number;
	centerX: number;
	centerZ: number;
	direction: 1 | -1;
}

function wingGeometry(side: 1 | -1): BufferGeometry {
	const g = new BufferGeometry();
	// треугольное крыло: от тела наружу, кончик чуть отведён назад
	g.setAttribute(
		"position",
		new Float32BufferAttribute(
			[0, 0, 0.14, 0, 0, -0.1, side * 0.6, 0, -0.08],
			3,
		),
	);
	g.computeVertexNormals();
	return g;
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
			flapRate: 7 + random() * 4,
			centerX: i % 2 ? 0 : (random() - 0.5) * 20,
			centerZ: i % 2 ? 0 : (random() - 0.5) * 20,
			direction: random() < 0.75 ? 1 : -1,
		}));
	}, []);
	const left = useMemo(() => wingGeometry(-1), []);
	const right = useMemo(() => wingGeometry(1), []);
	const bodies = useRef<InstancedMesh>(null);
	const leftWings = useRef<InstancedMesh>(null);
	const rightWings = useRef<InstancedMesh>(null);
	const temp = useMemo(
		() => ({ dummy: new Object3D(), wing: new Matrix4(), base: new Matrix4() }),
		[],
	);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const night = paletteAt(currentSample.timeOfDay).night;
		const presence = Math.max(0, 1 - Math.max(0, night - 0.5) * 2.5);
		const { dummy, wing, base } = temp;
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
			const gliding = Math.sin(t * 0.5 + b.phase * 3) > 0.6;
			const flap = gliding ? 0.08 : Math.sin(t * b.flapRate + b.phase) * 0.6;
			wing.makeRotationZ(flap);
			leftWings.current?.setMatrixAt(i, wing.clone().premultiply(base));
			wing.makeRotationZ(-flap);
			rightWings.current?.setMatrixAt(i, wing.clone().premultiply(base));
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
				args={[undefined, undefined, COUNT]}
				frustumCulled={false}
			>
				<sphereGeometry args={[0.07, 6, 4]} />
				<meshStandardMaterial color={COLOR} roughness={1} />
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
