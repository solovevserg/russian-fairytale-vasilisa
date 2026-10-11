import { describe, expect, test } from "bun:test";

import { distanceToPath } from "../../src/scene/terrain";
import {
	bushDensity,
	grassDensity,
	scatter,
	tallGrassDensity,
} from "../../src/scene/vegetation/layout";

describe("растительность", () => {
	const grass = scatter({
		seed: 1,
		radius: 30,
		spacing: 0.8,
		density: grassDensity,
		scale: [0.8, 1.2],
	});

	test("детерминирована по seed", () => {
		expect(
			scatter({
				seed: 1,
				radius: 30,
				spacing: 0.8,
				density: grassDensity,
				scale: [0.8, 1.2],
			}),
		).toEqual(grass);
	});

	test("на тропе травы нет, у ног избушки — тоже", () => {
		for (const p of grass) {
			expect(distanceToPath(p.x, p.z)).toBeGreaterThan(0.6);
			expect(Math.hypot(p.x, p.z)).toBeGreaterThan(1.4);
		}
	});

	test("на поляне трава гуще, чем в лесу", () => {
		const count = (from: number, to: number) =>
			grass.filter((p) => {
				const r = Math.hypot(p.x, p.z);
				return r >= from && r < to;
			}).length /
			(Math.PI * (to * to - from * from));
		expect(count(3, 11)).toBeGreaterThan(count(24, 30) * 1.5);
	});

	test("высокая трава и кусты не растут на тропе и в центре поляны", () => {
		expect(tallGrassDensity(0, 2)).toBe(0);
		expect(bushDensity(0, 3)).toBe(0);
		for (let d = 0; d < 40; d += 2) {
			const x = d * 0.55;
			const z = d * 0.835;
			if (distanceToPath(x, z) < 1) {
				expect(tallGrassDensity(x, z)).toBe(0);
				expect(bushDensity(x, z)).toBe(0);
			}
		}
	});
});
