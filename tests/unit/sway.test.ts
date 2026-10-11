import { describe, expect, test } from "bun:test";

import { swayAt } from "../../src/scene/pointerParallax";

describe("покачивание камеры без мыши", () => {
	test("лёгкое: не дальше половины хода мыши и без рывков", () => {
		let prev = swayAt(0);
		for (let t = 0.05; t < 120; t += 0.05) {
			const p = swayAt(t);
			expect(Math.abs(p.x)).toBeLessThanOrEqual(0.5);
			expect(Math.abs(p.y)).toBeLessThanOrEqual(0.5);
			expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(0.02);
			prev = p;
		}
	});
});
