import {describe, expect, test} from "bun:test";

import {distanceToPath} from "../../src/scene/terrain";
import {DEPARTURE, departureAt} from "../../src/story/departure";

const START: [number, number] = [4.9, 7.4];
const FACING = Math.atan2(-3.1, -2.1);

describe("уход Василисы с черепом", () => {
	test("сначала стоит на месте лицом к Бабе Яге", () => {
		const p = departureAt(0.5, START, FACING);
		expect(p.x).toBeCloseTo(START[0]);
		expect(p.z).toBeCloseTo(START[1]);
		expect(p.heading).toBeCloseTo(FACING);
	});

	test("потом уходит далеко по тропе — прочь от избушки", () => {
		const end = DEPARTURE.stand + DEPARTURE.turn + 40;
		const p = departureAt(end, START, FACING);
		expect(Math.hypot(p.x, p.z)).toBeGreaterThan(Math.hypot(...START) + 25);
		expect(distanceToPath(p.x, p.z)).toBeLessThan(0.3);
	});

	test("на ходу оглядывается и вправо, и влево, но не разворачивается назад", () => {
		const offsets: number[] = [];
		for (let t = 9; t < 35; t += 0.25) {
			const p = departureAt(t, START, FACING);
			const q = departureAt(t + 0.25, START, FACING);
			const along = Math.atan2(q.x - p.x, q.z - p.z);
			offsets.push(
				Math.atan2(Math.sin(p.heading - along), Math.cos(p.heading - along)),
			);
		}
		expect(Math.max(...offsets)).toBeGreaterThan(0.2);
		expect(Math.min(...offsets)).toBeLessThan(-0.2);
		expect(Math.max(...offsets.map(Math.abs))).toBeLessThan(1);
	});
});
