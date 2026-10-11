import {describe, expect, mock, test} from "bun:test";

import type {TreeVariantSpec} from "../../src/scene/forest/variants";

// генератор подменён: ez-tree в тестах не нужен — проверяем только очередь
const generated: string[] = [];
mock.module("../../src/scene/forest/createTreeVariant", () => ({
	createTreeVariant: (spec: TreeVariantSpec) => {
		generated.push(spec.id);
		return {spec};
	},
}));
const {generateTree} = await import("../../src/scene/forest/treeQueue");
const {chunkBySector} = await import("../../src/scene/forest/Forest");

const spec = (id: string) => ({id}) as TreeVariantSpec;

describe("очередь генерации деревьев", () => {
	test("по приоритету: сначала деревья у дома, глубина леса — последней", async () => {
		await Promise.all([
			generateTree(spec("deep"), 3),
			generateTree(spec("edge"), 1),
			generateTree(spec("home"), 0),
			generateTree(spec("bush"), 2),
		]);
		expect(generated).toEqual(["home", "edge", "bush", "deep"]);
	});

	test("один вариант генерируется один раз", async () => {
		const [a, b] = await Promise.all([
			generateTree(spec("oak"), 0),
			generateTree(spec("oak"), 0),
		]);
		expect(a).toBe(b);
		expect(generated.filter((id) => id === "oak")).toHaveLength(1);
	});
});

describe("группы инстансов по секторам", () => {
	test("один вариант в одном секторе — одна группа; разные стороны — разные", () => {
		const tree = (x: number, z: number, variantIndex = 0) => ({
			x,
			y: 0,
			z,
			scale: 1,
			rotation: 0,
			tilt: 0,
			variantIndex,
		});
		const chunks = chunkBySector(
			[tree(10, 1), tree(11, 2), tree(-10, -1), tree(10, 1, 1)],
			(i) => `v${i}`,
			"home-",
		);
		expect(chunks).toHaveLength(3);
		expect(chunks.every((c) => c.key.startsWith("home-v"))).toBe(true);
		expect(chunks.find((c) => c.placements.length === 2)?.variantIndex).toBe(0);
	});
});
