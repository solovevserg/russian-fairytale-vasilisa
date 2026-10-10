import { describe, expect, test } from "bun:test";
import { layoutForest } from "../../src/scene/forestLayout";

const options = { seed: 7, count: 100, clearingRadius: 10, outerRadius: 50 };

describe("layoutForest", () => {
	test("детерминирован по seed", () => {
		expect(layoutForest(options)).toEqual(layoutForest(options));
	});

	test("разные seed дают разный лес", () => {
		expect(layoutForest(options)).not.toEqual(
			layoutForest({ ...options, seed: 8 }),
		);
	});

	test("деревья не заходят на поляну и не выходят за край", () => {
		for (const tree of layoutForest(options)) {
			const r = Math.hypot(tree.x, tree.z);
			expect(r).toBeGreaterThanOrEqual(options.clearingRadius);
			expect(r).toBeLessThanOrEqual(options.outerRadius);
		}
	});
});
