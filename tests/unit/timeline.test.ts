import {describe, expect, test} from "bun:test";

import {heightAt} from "../../src/scene/terrain";
import {chapters} from "../../src/story/chapters";
import {KEYFRAMES} from "../../src/story/scenes";
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

	test("время идёт вперёд: из дня пролога в ночь — через вечер и полночь", () => {
		// между «Прологом» (13:00) и «Огонь погас» (1:00) — полночь
		expect(timeline.sample(11 / 12).timeOfDay).toBeCloseTo(0, 5);
	});

	test("камера не уходит под землю", () => {
		for (let p = 0; p <= timeline.length - 1; p += 0.05) {
			const {x, y, z} = timeline.sample(p).position;
			expect(y).toBeGreaterThan(heightAt(x, z) + 0.3);
		}
	});
});

describe("музыка в таймлайне", () => {
	const timeline = createTimeline(KEYFRAMES);

	test("на кадре звучит только трек главы", () => {
		KEYFRAMES.forEach((k, i) => {
			const {music} = timeline.sample(i);
			for (const [track, volume] of Object.entries(music)) {
				expect(volume).toBeCloseTo(
					track === k.music.track ? k.music.volume : 0,
				);
			}
		});
	});

	test("между главами с разной музыкой — кроссфейд", () => {
		// «Восход» (castle) → «Поляна» (catacombs)
		const {music} = timeline.sample(4.5);
		expect(music.castle).toBeGreaterThan(0);
		expect(music.catacombs).toBeGreaterThan(0);
		expect(music.hut).toBe(0);
	});
});

describe("Василиса в таймлайне", () => {
	const timeline = createTimeline(KEYFRAMES);
	const index = (id: string) => KEYFRAMES.findIndex((k) => k.id === id);

	test("с куколкой и в зачине, и в «Огонь погас»", () => {
		expect(timeline.sample(index("prologue")).vasilisa.prop).toBe("doll");
		const {vasilisa} = timeline.sample(index("fire"));
		expect(vasilisa.visible).toBe(true);
		expect(vasilisa.prop).toBe("doll");
	});

	test("между кадрами идёт по тропе к избушке", () => {
		const a = timeline.sample(index("fire")).vasilisa;
		const mid = {...timeline.sample(index("fire") + 0.5).vasilisa};
		const b = timeline.sample(index("white-rider")).vasilisa;
		const r = (v: {x: number; z: number}) => Math.hypot(v.x, v.z);
		expect(r(mid)).toBeLessThan(r(a));
		expect(r(mid)).toBeGreaterThan(r(b));
	});

	test("в «Задачах» спит, в эпилоге уходит с черепом", () => {
		expect(timeline.sample(index("tasks")).vasilisa.pose).toBe("sleep");
		expect(timeline.sample(index("epilogue")).vasilisa.prop).toBe("skull");
	});
});

describe("изба Василисы", () => {
	const timeline = createTimeline(KEYFRAMES);
	const index = (id: string) => KEYFRAMES.findIndex((k) => k.id === id);
	test("есть в начале и в конце пути, на тропе со второй главы — нет", () => {
		expect(timeline.sample(index("prologue")).house).toBe(true);
		expect(timeline.sample(index("fire")).house).toBe(true);
		for (const id of [
			"white-rider",
			"red-rider",
			"sunrise",
			"clearing",
			"skull",
		])
			expect(timeline.sample(index(id)).house).toBe(false);
		expect(timeline.sample(index("epilogue")).house).toBe(true);
	});
});
