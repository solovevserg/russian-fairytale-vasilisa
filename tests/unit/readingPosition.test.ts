import {describe, expect, test} from "bun:test";

import {readingPosition} from "../../src/story/readingPosition";

const anchors = {chapters: [1000, 2000, 3000], start: 0, credits: 4000};

describe("положение чтения", () => {
	test("на титуле — край start, title 1", () => {
		expect(readingPosition(anchors, 0)).toEqual({
			progress: 0,
			activeChapter: 0,
			title: 1,
			credits: 0,
			edge: "start",
		});
	});

	test("между главами — дробный прогресс, ближайшая глава активна", () => {
		const p = readingPosition(anchors, 1700);
		expect(p.progress).toBeCloseTo(0.7);
		expect(p.activeChapter).toBe(1);
		expect(p.edge).toBeNull();
		expect(p.title).toBe(0);
	});

	test("на полпути к титульной карточке — уже не край", () => {
		const p = readingPosition(anchors, 600);
		expect(p.title).toBeCloseTo(0.4);
		expect(p.edge).toBeNull();
	});

	test("после эпилога — к титрам; дальше середины — край credits", () => {
		expect(readingPosition(anchors, 3400).credits).toBeCloseTo(0.4);
		expect(readingPosition(anchors, 3400).edge).toBeNull();
		const end = readingPosition(anchors, 4000);
		expect(end.credits).toBe(1);
		expect(end.edge).toBe("credits");
		expect(end.progress).toBe(2);
	});
});
