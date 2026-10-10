import { describe, expect, test } from "bun:test";
import { heightAt } from "../../src/scene/terrain";
import { chapters } from "../../src/story/chapters";
import { KEYFRAMES } from "../../src/story/keyframes";
import {
	createTimeline,
	progressFromAnchors,
	shapeProgress,
	unwrapHours,
} from "../../src/story/timeline";

describe("progressFromAnchors", () => {
	const anchors = [100, 300, 700];

	test("до первой главы — 0, после последней — N-1", () => {
		expect(progressFromAnchors(anchors, 0)).toBe(0);
		expect(progressFromAnchors(anchors, 5000)).toBe(2);
	});

	test("на якоре — целый индекс, между якорями — доля", () => {
		expect(progressFromAnchors(anchors, 300)).toBe(1);
		expect(progressFromAnchors(anchors, 200)).toBeCloseTo(0.5);
		expect(progressFromAnchors(anchors, 600)).toBeCloseTo(1.75);
	});
});

describe("shapeProgress", () => {
	test("держит кадр в середине главы и монотонен", () => {
		expect(shapeProgress(3.1)).toBe(3);
		expect(shapeProgress(3.9)).toBe(4);
		let prev = 0;
		for (let p = 0; p <= 5; p += 0.01) {
			const v = shapeProgress(p);
			expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
			prev = v;
		}
	});
});

describe("unwrapHours", () => {
	test("время идёт только вперёд", () => {
		expect(unwrapHours([22, 3, 5.5, 12])).toEqual([22, 27, 29.5, 36]);
	});
});

describe("timeline", () => {
	const timeline = createTimeline(KEYFRAMES);

	test("ключевой кадр на каждую главу", () => {
		expect(KEYFRAMES.map((k) => k.id)).toEqual(chapters.map((c) => c.id));
	});

	test("на целом прогрессе — ровно ключевой кадр", () => {
		KEYFRAMES.forEach((k, i) => {
			const s = timeline.sample(i);
			expect(s.position.toArray().map((v) => +v.toFixed(4))).toEqual(
				k.camera.position.map((v) => +v.toFixed(4)),
			);
			expect(s.timeOfDay).toBeCloseTo(k.timeOfDay % 24);
			expect(s.fov).toBeCloseTo(k.camera.fov);
		});
	});

	test("ночь → утро идёт через рассвет, а не назад через вечер", () => {
		// между «Прологом» (22:00) и «Огонь погас» (3:00) — полночь
		expect(timeline.sample(0.4).timeOfDay).toBeCloseTo(0, 5);
	});

	test("камера не уходит под землю", () => {
		for (let p = 0; p <= timeline.length - 1; p += 0.05) {
			const { x, y, z } = timeline.sample(p).position;
			expect(y).toBeGreaterThan(heightAt(x, z) + 0.3);
		}
	});
});
