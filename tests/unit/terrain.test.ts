import { describe, expect, test } from "bun:test";
import { CLEARING_RADIUS, heightAt } from "../../src/scene/terrain";

describe("terrain", () => {
	test("поляна вокруг избушки ровная", () => {
		for (let a = 0; a < Math.PI * 2; a += 0.3) {
			const r = CLEARING_RADIUS * 0.8;
			// допускаем только неглубокую ложбинку тропы
			expect(Math.abs(heightAt(Math.cos(a) * r, Math.sin(a) * r))).toBeLessThan(
				0.3,
			);
		}
		expect(heightAt(0, 0)).toBeCloseTo(-0.25, 1);
	});

	test("в лесу есть рельеф", () => {
		const heights = Array.from({ length: 50 }, (_, i) => heightAt(40 + i, -30));
		expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.5);
	});
});
