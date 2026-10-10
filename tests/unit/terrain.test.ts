import { describe, expect, test } from "bun:test";
import {
	CLEARING_RADIUS,
	distanceToPath,
	heightAt,
	pathFrame,
} from "../../src/scene/terrain";

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

describe("pathFrame", () => {
	test("точки оси лежат на тропе", () => {
		for (let d = 2; d < 60; d += 3) {
			const { x, z } = pathFrame(d);
			expect(distanceToPath(x, z)).toBeLessThan(0.05);
		}
	});

	test("направление к избушке — единичный вектор, смотрящий к центру", () => {
		const f = pathFrame(30);
		expect(Math.hypot(f.toHutX, f.toHutZ)).toBeCloseTo(1);
		expect(f.x * f.toHutX + f.z * f.toHutZ).toBeLessThan(0);
	});
});
