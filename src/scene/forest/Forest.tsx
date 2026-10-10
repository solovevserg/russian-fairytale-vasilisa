import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import { debugFlags } from "../../debugFlags";
import { useSceneStore } from "../../state/sceneStore";
import { layoutForest, type TreePlacement } from "../forestLayout";
import { createTreeVariant, type TreeVariantAssets } from "./createTreeVariant";
import { TREE_VARIANTS } from "./variants";
import { windUniforms } from "./wind";

const SECTORS = 8;

const LAYOUT = {
	seed: 42,
	variants: TREE_VARIANTS,
	outerRadius: 65,
	edgeWidth: 14,
	minDistance: 3.2,
	maxTrees: { edge: 90, deep: 200 },
};

export function VariantInstances({
	assets,
	placements,
}: {
	assets: TreeVariantAssets;
	placements: TreePlacement[];
}) {
	const branches = useRef<InstancedMesh>(null);
	const leaves = useRef<InstancedMesh>(null);

	useLayoutEffect(() => {
		const dummy = new Object3D();
		placements.forEach((tree, i) => {
			dummy.position.set(tree.x, tree.y, tree.z);
			dummy.rotation.set(tree.tilt, tree.rotation, tree.tilt * 0.5);
			dummy.scale.setScalar(tree.scale);
			dummy.updateMatrix();
			branches.current?.setMatrixAt(i, dummy.matrix);
			leaves.current?.setMatrixAt(i, dummy.matrix);
		});
		for (const mesh of [branches.current, leaves.current]) {
			if (!mesh) continue;
			mesh.instanceMatrix.needsUpdate = true;
			mesh.computeBoundingSphere();
		}
	}, [placements]);

	const count = placements.length;
	// тени отбрасывают только деревья у поляны: дальние скрыты туманом, а тени удваивают нагрузку
	const shadows = assets.spec.zone === "edge" && !debugFlags.noShadows;
	return (
		<>
			<instancedMesh
				visible={!debugFlags.noBranches}
				ref={branches}
				args={[assets.branches.geometry, assets.branches.material, count]}
				customDepthMaterial={assets.branches.depthMaterial}
				castShadow={shadows}
				receiveShadow={shadows}
			/>
			<instancedMesh
				visible={!debugFlags.noLeaves}
				ref={leaves}
				args={[assets.leaves.geometry, assets.leaves.material, count]}
				customDepthMaterial={assets.leaves.depthMaterial}
				castShadow={shadows}
				receiveShadow={shadows}
			/>
		</>
	);
}

export function Forest() {
	const variants = useMemo(() => {
		const started = performance.now();
		const result = TREE_VARIANTS.map(createTreeVariant);
		if (import.meta.env.DEV) {
			console.info(
				`[forest] ${result.length} вариантов за ${Math.round(performance.now() - started)} мс`,
				JSON.stringify(
					Object.fromEntries(
						result.map((v) => [v.spec.id, Math.round(v.triangles)]),
					),
				),
			);
		}
		return result;
	}, []);

	// Инстансы бьются на угловые секторы: InstancedMesh отсекается по фрустуму
	// только целиком, а так деревья за спиной камеры не рисуются вовсе.
	const chunks = useMemo(() => {
		const trees = layoutForest(LAYOUT);
		const groups = variants.map(() => [] as TreePlacement[]);
		const bySector = new Map<
			string,
			{ variantIndex: number; placements: TreePlacement[] }
		>();
		for (const tree of trees) {
			groups[tree.variantIndex].push(tree);
			const angle = Math.atan2(tree.z, tree.x) + Math.PI;
			const sector = Math.min(
				Math.floor((angle / (Math.PI * 2)) * SECTORS),
				SECTORS - 1,
			);
			const key = `${variants[tree.variantIndex].spec.id}-${sector}`;
			const chunk = bySector.get(key) ?? {
				variantIndex: tree.variantIndex,
				placements: [],
			};
			chunk.placements.push(tree);
			bySector.set(key, chunk);
		}
		if (import.meta.env.DEV) {
			const triangles = groups.reduce(
				(sum, g, i) => sum + g.length * variants[i].triangles,
				0,
			);
			console.info(
				`[forest] деревьев: ${trees.length}, треугольников: ${(triangles / 1e6).toFixed(2)} M`,
				JSON.stringify(
					Object.fromEntries(
						groups.map((g, i) => [variants[i].spec.id, g.length]),
					),
				),
			);
		}
		return [...bySector.entries()].map(([key, chunk]) => ({ key, ...chunk }));
	}, [variants]);

	useEffect(
		() => () => {
			for (const v of variants) {
				for (const part of [v.branches, v.leaves]) {
					part.geometry.dispose();
					part.material.dispose();
					part.depthMaterial.dispose();
				}
			}
		},
		[variants],
	);

	useFrame((_, delta) => {
		windUniforms.uTime.value += delta;
		const wind = useSceneStore.getState().wind;
		windUniforms.uWindStrength.value = 0.15 + wind * 0.9;
	});

	return (
		<group>
			{chunks.map((chunk) => (
				<VariantInstances
					key={chunk.key}
					assets={variants[chunk.variantIndex]}
					placements={chunk.placements}
				/>
			))}
		</group>
	);
}
