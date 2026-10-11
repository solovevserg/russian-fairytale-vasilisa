import { describe, expect, test } from "bun:test";

import { KEYFRAMES } from "../../src/story/keyframes";
import { stepLight } from "../../src/story/lightDelay";

describe("смена времени суток", () => {
	const clearing = KEYFRAMES.findIndex((k) => k.id === "clearing");

	/** За сколько секунд свет дойдёт от главы `from` до главы `to` при 60 fps. */
	function secondsToReach(from: number, to: number): number {
		let p = from;
		let t = 0;
		while (Math.abs(to - p) > 0.01 && t < 60) {
			p = stepLight(p, to, 1 / 60, 1.6);
			t += 1 / 60;
		}
		return t;
	}

	test("от «Восхода» к «Поляне» — за 5–8 секунд", () => {
		const t = secondsToReach(clearing - 1, clearing);
		expect(t).toBeGreaterThanOrEqual(5);
		expect(t).toBeLessThanOrEqual(8);
	});

	test("в обычных переходах — как раньше, за пару секунд", () => {
		expect(secondsToReach(clearing, clearing + 1)).toBeLessThan(3.5);
	});
});
