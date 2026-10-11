import {describe, expect, test} from "bun:test";

import {TREE_VARIANTS} from "../../src/scene/forest/variants";
import {layoutForest} from "../../src/scene/forestLayout";
import {CLEARING_RADIUS, distanceToPath} from "../../src/scene/terrain";

const options = {
	seed: 7,
	variants: TREE_VARIANTS,
	outerRadius: 60,
	edgeWidth: 14,
	minDistance: 3,
	maxTrees: {edge: 60, deep: 120},
};

describe("layoutForest", () => {
	const trees = layoutForest(options);

	test("детерминирован по seed", () => {
		expect(layoutForest(options)).toEqual(trees);
	});

	test("разные seed дают разный лес", () => {
		expect(layoutForest({...options, seed: 8})).not.toEqual(trees);
	});

	test("деревья не растут на поляне, на тропе и за краем", () => {
		for (const tree of trees) {
			const r = Math.hypot(tree.x, tree.z);
			expect(r).toBeGreaterThanOrEqual(CLEARING_RADIUS);
			expect(r).toBeLessThanOrEqual(options.outerRadius);
			expect(distanceToPath(tree.x, tree.z)).toBeGreaterThan(2);
		}
	});

	test("стволы не пересекаются", () => {
		for (let i = 0; i < trees.length; i++) {
			for (let j = i + 1; j < trees.length; j++) {
				const d = Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z);
				expect(d).toBeGreaterThanOrEqual(options.minDistance);
			}
		}
	});

	test("у кромки — варианты зоны edge, в глубине — deep", () => {
		for (const tree of trees) {
			const zone = TREE_VARIANTS[tree.variantIndex].zone;
			const r = Math.hypot(tree.x, tree.z);
			expect(zone).toBe(
				r < CLEARING_RADIUS + options.edgeWidth ? "edge" : "deep",
			);
		}
	});
});
