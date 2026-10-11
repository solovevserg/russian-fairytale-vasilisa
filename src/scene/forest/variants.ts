import type {TreePreset} from "@dgreenheck/ez-tree";

export type TreePresetName = keyof typeof TreePreset;
export type ForestZone = "edge" | "deep";

export interface TreeVariantSpec {
	id: string;
	preset: TreePresetName;
	seed: number;
	/** Высота дерева в метрах после масштабирования. */
	height: number;
	/** Относительная частота варианта в своей зоне. */
	weight: number;
	zone: ForestZone;
	/** Детализация 0..1: у поляны выше, в глубине леса — ниже. */
	detail: number;
	/**
	 * Детализация веток 0..1, если отличается от `detail`: у кустов и дальних
	 * деревьев ветки почти не видны под листвой и в тумане.
	 */
	branchDetail?: number;
	barkType?: string;
	leafTint?: number;
	barkTint?: number;
}

// Тёмный еловый лес; у кромки поляны — старый дуб, осины и молодые ели.
export const TREE_VARIANTS: TreeVariantSpec[] = [
	{
		id: "pine-edge-a",
		preset: "Pine Large",
		seed: 101,
		height: 19,
		weight: 3,
		zone: "edge",
		detail: 0.55,
		leafTint: 0x5f7a5a,
	},
	{
		id: "pine-edge-b",
		preset: "Pine Medium",
		seed: 202,
		height: 13,
		weight: 3,
		zone: "edge",
		detail: 0.55,
		leafTint: 0x667f5c,
	},
	{
		id: "oak-old",
		preset: "Oak Large",
		seed: 303,
		height: 14,
		weight: 1,
		zone: "edge",
		detail: 0.55,
		leafTint: 0x7d8c55,
		barkTint: 0x8a8070,
	},
	{
		id: "aspen",
		preset: "Aspen Medium",
		seed: 404,
		height: 12,
		weight: 2,
		zone: "edge",
		detail: 0.55,
		barkType: "birch",
		leafTint: 0x9aa860,
	},
	{
		id: "pine-small",
		preset: "Pine Small",
		seed: 505,
		height: 6,
		weight: 2,
		zone: "edge",
		detail: 0.55,
		leafTint: 0x6a855e,
	},
	{
		id: "pine-deep-a",
		preset: "Pine Large",
		seed: 606,
		height: 21,
		weight: 3,
		zone: "deep",
		detail: 0.25,
		branchDetail: 0.3,
		leafTint: 0x4e664b,
	},
	{
		id: "pine-deep-b",
		preset: "Pine Medium",
		seed: 707,
		height: 15,
		weight: 2,
		zone: "deep",
		detail: 0.25,
		branchDetail: 0.3,
		leafTint: 0x56704f,
	},
];

/** Кусты — пресеты ez-tree, с тем же ветром, что и деревья. */
export const BUSH_SPECS: TreeVariantSpec[] = [
	{
		id: "bush-1",
		preset: "Bush 1",
		seed: 31,
		height: 1.6,
		weight: 1,
		zone: "edge",
		detail: 0.35,
		branchDetail: 0.2,
		leafTint: 0x6f8a4e,
	},
	{
		id: "bush-2",
		preset: "Bush 2",
		seed: 32,
		height: 1.2,
		weight: 1,
		zone: "edge",
		detail: 0.35,
		branchDetail: 0.2,
		leafTint: 0x7d8f50,
	},
	{
		id: "bush-3",
		preset: "Bush 3",
		seed: 33,
		height: 2.0,
		weight: 1,
		zone: "edge",
		detail: 0.35,
		branchDetail: 0.2,
		leafTint: 0x5f7a48,
	},
];
