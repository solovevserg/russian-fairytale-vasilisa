import { Tree, TreePreset } from "@dgreenheck/ez-tree";
import {
	type BufferGeometry,
	type Material,
	MeshDepthMaterial,
	type MeshPhongMaterial,
	RGBADepthPacking,
} from "three";
import type { TreeVariantSpec } from "./variants";
import { applyWind } from "./wind";

export interface TreeVariantAssets {
	spec: TreeVariantSpec;
	branches: {
		geometry: BufferGeometry;
		material: Material;
		depthMaterial: Material;
	};
	leaves: {
		geometry: BufferGeometry;
		material: Material;
		depthMaterial: Material;
	};
	triangles: number;
}

type TreeJson = (typeof TreePreset)[keyof typeof TreePreset];

/** detail: 1 — исходный пресет, меньше — меньше листьев (но крупнее) и сегментов. */
function simplify(json: TreeJson, detail: number): TreeJson {
	const copy: TreeJson = structuredClone(json);
	const { branch, leaves } = copy;
	for (const level of Object.keys(
		branch.sections,
	) as (keyof typeof branch.sections)[]) {
		branch.sections[level] = Math.max(
			3,
			Math.round(branch.sections[level] * Math.max(detail, 0.5)),
		);
		branch.segments[level] = Math.max(
			3,
			Math.round(branch.segments[level] * Math.max(detail, 0.6)),
		);
	}
	leaves.count = Math.max(1, Math.round(leaves.count * detail));
	leaves.size *= 1 / Math.sqrt(detail);
	return copy;
}

function triangleCount(geometry: BufferGeometry): number {
	return (geometry.index?.count ?? geometry.attributes.position.count) / 3;
}

/** Генерирует дерево ez-tree, масштабирует до нужной высоты и навешивает ветер. */
export function createTreeVariant(spec: TreeVariantSpec): TreeVariantAssets {
	const json = structuredClone(TreePreset[spec.preset]);
	const options = simplify(json, spec.detail);
	options.seed = spec.seed;
	if (spec.barkType) options.bark.type = spec.barkType;
	if (spec.leafTint !== undefined) options.leaves.tint = spec.leafTint;
	if (spec.barkTint !== undefined) options.bark.tint = spec.barkTint;

	const tree = new Tree();
	tree.loadFromJson(options as unknown as Parameters<Tree["loadFromJson"]>[0]);
	tree.generate();

	const branchesGeometry = tree.branchesMesh.geometry;
	const leavesGeometry = tree.leavesMesh.geometry;
	branchesGeometry.computeBoundingBox();
	leavesGeometry.computeBoundingBox();
	const top = Math.max(
		branchesGeometry.boundingBox?.max.y ?? 1,
		leavesGeometry.boundingBox?.max.y ?? 1,
	);
	const scale = spec.height / top;
	branchesGeometry.scale(scale, scale, scale);
	leavesGeometry.scale(scale, scale, scale);

	const branchesMaterial = tree.branchesMesh.material as MeshPhongMaterial;
	const leavesMaterial = tree.leavesMesh.material as MeshPhongMaterial;

	const branchesDepth = new MeshDepthMaterial({
		depthPacking: RGBADepthPacking,
	});
	const leavesDepth = new MeshDepthMaterial({
		depthPacking: RGBADepthPacking,
		map: leavesMaterial.map,
		alphaTest: leavesMaterial.alphaTest,
	});

	applyWind(branchesMaterial, "bark", spec.height);
	applyWind(branchesDepth, "bark", spec.height);
	applyWind(leavesMaterial, "leaves", spec.height);
	applyWind(leavesDepth, "leaves", spec.height);

	return {
		spec,
		branches: {
			geometry: branchesGeometry,
			material: branchesMaterial,
			depthMaterial: branchesDepth,
		},
		leaves: {
			geometry: leavesGeometry,
			material: leavesMaterial,
			depthMaterial: leavesDepth,
		},
		triangles: triangleCount(branchesGeometry) + triangleCount(leavesGeometry),
	};
}
