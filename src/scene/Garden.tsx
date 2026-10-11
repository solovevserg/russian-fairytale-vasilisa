import {useFrame} from "@react-three/fiber";
import {useLayoutEffect, useMemo, useRef} from "react";
import {type Group, type InstancedMesh, Object3D, Vector3} from "three";

import {createRandom} from "../lib/random";
import {currentSample} from "../story/currentSample";
import {HOME, heightAt} from "./terrain";

/**
 * Огород за избой Василисы: грядки с капустой, плетень вокруг и пугало.
 * Координаты — в осях избы: x — вдоль фасада, z — от фасада к тропе
 * (огород — за избой, z < 0), дальше круга, по которому она обходит дом.
 */
const GARDEN = {
	/** Середина огорода в осях избы, м. */
	x: -1,
	z: -9,
	/** Ширина (вдоль фасада) и глубина, м. */
	width: 5.4,
	depth: 3,
};
const BEDS = [-0.85, 0, 0.85];
const BED_LENGTH = 4.4;
const SOIL = "#4a3423";
const CABBAGE = "#7aa255";
const WATTLE = "#6b5236";

/** Точка в осях избы → мир, высота — по рельефу. */
function fromHouse(lx: number, lz: number, out = new Vector3()) {
	const h = HOME.heading;
	const x = HOME.x + lx * Math.cos(h) + lz * Math.sin(h);
	const z = HOME.z - lx * Math.sin(h) + lz * Math.cos(h);
	return out.set(x, heightAt(x, z), z);
}

/** Кочаны вдоль грядок — с небольшим разбросом размера и места. */
function cabbages(): {x: number; z: number; s: number}[] {
	const random = createRandom(77);
	const list: {x: number; z: number; s: number}[] = [];
	for (const row of BEDS) {
		for (let x = -BED_LENGTH / 2 + 0.3; x <= BED_LENGTH / 2 - 0.3; x += 0.45) {
			list.push({
				x: GARDEN.x + x + (random() - 0.5) * 0.08,
				z: GARDEN.z + row + (random() - 0.5) * 0.12,
				s: 0.75 + random() * 0.4,
			});
		}
	}
	return list;
}

/** Колья плетня по периметру (с проходом со стороны избы). */
function wattlePosts(): {x: number; z: number}[] {
	const {x, z, width, depth} = GARDEN;
	const posts: {x: number; z: number}[] = [];
	const step = 0.6;
	for (let t = -width / 2; t <= width / 2 + 1e-6; t += step) {
		posts.push({x: x + t, z: z - depth / 2});
		// со стороны избы — проход посередине
		if (Math.abs(t) > 0.6) posts.push({x: x + t, z: z + depth / 2});
	}
	for (let t = -depth / 2 + step; t < depth / 2 - 1e-6; t += step) {
		posts.push({x: x - width / 2, z: z + t});
		posts.push({x: x + width / 2, z: z + t});
	}
	return posts;
}

export function Garden() {
	const root = useRef<Group>(null);
	const heads = useRef<InstancedMesh>(null);
	const stakes = useRef<InstancedMesh>(null);
	const plants = useMemo(cabbages, []);
	const posts = useMemo(wattlePosts, []);
	const yaw = HOME.heading;

	useLayoutEffect(() => {
		const dummy = new Object3D();
		const p = new Vector3();
		plants.forEach((c, i) => {
			fromHouse(c.x, c.z, p);
			dummy.position.set(p.x, p.y + 0.2 + 0.07 * c.s, p.z);
			dummy.rotation.set(0, i * 1.7, 0);
			dummy.scale.set(c.s, c.s * 0.75, c.s);
			dummy.updateMatrix();
			heads.current?.setMatrixAt(i, dummy.matrix);
		});
		posts.forEach((c, i) => {
			fromHouse(c.x, c.z, p);
			dummy.position.set(p.x, p.y + 0.42, p.z);
			dummy.rotation.set((i % 3) * 0.03, 0, ((i % 5) - 2) * 0.02);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			stakes.current?.setMatrixAt(i, dummy.matrix);
		});
		for (const mesh of [heads.current, stakes.current]) {
			if (!mesh) continue;
			mesh.instanceMatrix.needsUpdate = true;
			mesh.computeBoundingSphere();
		}
	}, [plants, posts]);

	// огород — при избе: виден только там, где в сцене она сама
	useFrame(() => {
		if (root.current) root.current.visible = currentSample.house;
	});

	const beds = BEDS.map((row) => fromHouse(GARDEN.x, GARDEN.z + row));
	const {width, depth} = GARDEN;
	// плетень: три полосы прутьев по сторонам
	const sides: {x: number; z: number; length: number; along: boolean}[] = [
		{x: GARDEN.x, z: GARDEN.z - depth / 2, length: width, along: true},
		{x: GARDEN.x - width / 2, z: GARDEN.z, length: depth, along: false},
		{x: GARDEN.x + width / 2, z: GARDEN.z, length: depth, along: false},
		// со стороны избы — две половины по бокам от прохода
		...[-1, 1].map((side) => ({
			x: GARDEN.x + side * (width / 4 + 0.35),
			z: GARDEN.z + depth / 2,
			length: width / 2 - 0.7,
			along: true,
		})),
	];
	const scarecrow = fromHouse(GARDEN.x + width / 2 - 0.9, GARDEN.z - 0.4);

	return (
		<group ref={root}>
			{beds.map((p, i) => (
				<mesh
					key={BEDS[i]}
					position={[p.x, p.y + 0.06, p.z]}
					rotation-y={yaw}
					receiveShadow
				>
					<boxGeometry args={[BED_LENGTH, 0.2, 0.6]} />
					<meshStandardMaterial color={SOIL} roughness={1} />
				</mesh>
			))}
			<instancedMesh
				ref={heads}
				args={[undefined, undefined, plants.length]}
				castShadow
				receiveShadow
			>
				<icosahedronGeometry args={[0.16, 1]} />
				<meshStandardMaterial color={CABBAGE} roughness={0.8} flatShading />
			</instancedMesh>
			<instancedMesh
				ref={stakes}
				args={[undefined, undefined, posts.length]}
				castShadow
			>
				<cylinderGeometry args={[0.03, 0.04, 0.9, 5]} />
				<meshStandardMaterial color={WATTLE} roughness={1} />
			</instancedMesh>
			{sides.map((s) => {
				const p = fromHouse(s.x, s.z);
				return [0.25, 0.45, 0.65].map((h) => (
					<mesh
						key={`${s.x}:${s.z}:${h}`}
						position={[p.x, p.y + h, p.z]}
						rotation-y={yaw + (s.along ? 0 : Math.PI / 2)}
						castShadow
					>
						<boxGeometry args={[s.length, 0.09, 0.05]} />
						<meshStandardMaterial color={WATTLE} roughness={1} />
					</mesh>
				));
			})}
			{/* пугало: шест с перекладиной, рубаха, голова-мешок и шапка */}
			<group
				position={[scarecrow.x, scarecrow.y, scarecrow.z]}
				rotation-y={yaw + 0.4}
			>
				<mesh position={[0, 0.9, 0]} castShadow>
					<cylinderGeometry args={[0.035, 0.045, 1.8, 6]} />
					<meshStandardMaterial color={WATTLE} roughness={1} />
				</mesh>
				<mesh position={[0, 1.35, 0]} rotation-z={Math.PI / 2} castShadow>
					<cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
					<meshStandardMaterial color={WATTLE} roughness={1} />
				</mesh>
				<mesh position={[0, 1.15, 0]} castShadow>
					<cylinderGeometry args={[0.22, 0.3, 0.6, 8]} />
					<meshStandardMaterial color="#a8433a" roughness={1} />
				</mesh>
				<mesh position={[0, 1.72, 0]} castShadow>
					<sphereGeometry args={[0.15, 10, 8]} />
					<meshStandardMaterial color="#c9b483" roughness={1} />
				</mesh>
				<mesh position={[0, 1.9, 0]} castShadow>
					<coneGeometry args={[0.2, 0.25, 10]} />
					<meshStandardMaterial color="#3d2e22" roughness={1} />
				</mesh>
			</group>
		</group>
	);
}
