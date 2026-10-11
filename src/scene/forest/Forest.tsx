import {useFrame} from "@react-three/fiber";
import {useEffect, useLayoutEffect, useMemo, useRef} from "react";
import {type InstancedMesh, Object3D} from "three";

import {debugFlags} from "../../debugFlags";
import {useSceneStore} from "../../state/sceneStore";
import {
	HOME_TREE_IDS,
	layoutForest,
	layoutHomeTrees,
	type TreePlacement,
} from "../forestLayout";
import {Precompiled} from "../Precompiled";
import {quality} from "../quality";
import type {TreeVariantAssets} from "./createTreeVariant";
import {allReady, useTreeVariants} from "./useTreeVariants";
import {TREE_VARIANTS, type TreeVariantSpec} from "./variants";
import {windUniforms} from "./wind";

const SECTORS = 8;

const LAYOUT = {
	seed: 42,
	variants: TREE_VARIANTS,
	outerRadius: 65,
	edgeWidth: 14,
	minDistance: 3.2,
	maxTrees: {
		edge: quality.edgeTrees,
		deep: Math.round(200 * quality.deepTrees),
	},
};

export function VariantInstances({
	assets,
	placements,
	castShadow = true,
}: {
	assets: TreeVariantAssets;
	placements: TreePlacement[];
	/** false — только принимает тени (кусты: их тень теряется в траве). */
	castShadow?: boolean;
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
	const shadows = assets.spec.zone === "edge" && quality.shadows;
	// деревья появляются по ходу — их шейдеры компилируются в фоне, до показа
	return (
		<Precompiled>
			<instancedMesh
				visible={!debugFlags.noBranches}
				ref={branches}
				args={[assets.branches.geometry, assets.branches.material, count]}
				customDepthMaterial={assets.branches.depthMaterial}
				castShadow={shadows && castShadow && quality.branchShadows}
				receiveShadow={shadows}
			/>
			<instancedMesh
				visible={!debugFlags.noLeaves}
				ref={leaves}
				args={[assets.leaves.geometry, assets.leaves.material, count]}
				customDepthMaterial={assets.leaves.depthMaterial}
				castShadow={shadows && castShadow}
				receiveShadow={shadows}
			/>
		</Precompiled>
	);
}

/** Группа инстансов: один вариант в одном угловом секторе. */
export interface TreeChunk {
	key: string;
	variantIndex: number;
	placements: TreePlacement[];
}

/**
 * Разбивает деревья на группы инстансов по вариантам и угловым секторам:
 * InstancedMesh отсекается по фрустуму только целиком, а так деревья за
 * спиной камеры не рисуются вовсе.
 */
export function chunkBySector(
	trees: readonly TreePlacement[],
	idOf: (variantIndex: number) => string,
	keyPrefix = "",
): TreeChunk[] {
	const chunks = new Map<string, TreeChunk>();
	for (const tree of trees) {
		const angle = Math.atan2(tree.z, tree.x) + Math.PI;
		const sector = Math.min(
			Math.floor((angle / (Math.PI * 2)) * SECTORS),
			SECTORS - 1,
		);
		const key = `${keyPrefix}${idOf(tree.variantIndex)}-${sector}`;
		const chunk = chunks.get(key) ?? {
			key,
			variantIndex: tree.variantIndex,
			placements: [],
		};
		chunk.placements.push(tree);
		chunks.set(key, chunk);
	}
	return [...chunks.values()];
}

/**
 * Очерёдность генерации: деревья у дома Василисы (первый кадр) — первыми,
 * потом кромка леса, кусты (см. Vegetation), глубина леса.
 */
const treePriority = (spec: TreeVariantSpec) =>
	HOME_TREE_IDS.has(spec.id) ? 0 : spec.zone === "edge" ? 1 : 3;

const idOf = (variantIndex: number) => TREE_VARIANTS[variantIndex].id;

/**
 * Лес. Деревья у дома появляются, как только готовы их варианты; остальной
 * лес — разом, когда готовы все (иначе видно, как он «дорастает»).
 */
export function Forest() {
	const variants = useTreeVariants(TREE_VARIANTS, treePriority);
	const ready = allReady(variants);
	useEffect(() => {
		// метка для тестов и отладки: весь лес построен
		if (ready) document.documentElement.dataset.forest = "ready";
	}, [ready]);

	const homeTrees = useMemo(() => layoutHomeTrees(TREE_VARIANTS), []);
	const forestTrees = useMemo(() => layoutForest(LAYOUT), []);

	const homeChunks = useMemo(
		() =>
			chunkBySector(
				homeTrees.filter((tree) => variants[tree.variantIndex]),
				idOf,
				"home-",
			),
		[homeTrees, variants],
	);
	const forestChunks = useMemo(() => {
		if (!ready) return [];
		if (import.meta.env.DEV) {
			const trees = [...forestTrees, ...homeTrees];
			const triangles = trees.reduce(
				(sum, tree) => sum + variants[tree.variantIndex].triangles,
				0,
			);
			console.info(
				`[forest] деревьев: ${trees.length}, треугольников: ${(triangles / 1e6).toFixed(2)} M`,
			);
		}
		return chunkBySector(forestTrees, idOf);
	}, [ready, forestTrees, homeTrees, variants]);

	useFrame((_, delta) => {
		// на слабых устройствах лес и трава стоят неподвижно
		if (!quality.wind) {
			windUniforms.uWindStrength.value = 0;
			return;
		}
		windUniforms.uTime.value += delta;
		const wind = useSceneStore.getState().wind;
		windUniforms.uWindStrength.value = 0.15 + wind * 0.9;
	});

	return (
		<group>
			{[...homeChunks, ...forestChunks].map((chunk) => {
				const assets = variants[chunk.variantIndex];
				return (
					assets && (
						<VariantInstances
							key={chunk.key}
							assets={assets}
							placements={chunk.placements}
						/>
					)
				);
			})}
		</group>
	);
}
