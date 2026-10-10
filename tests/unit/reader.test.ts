import { describe, expect, test } from "bun:test";
import {
	easeInOutCubic,
	MIN_READING_SECONDS,
	readingSeconds,
	splitSentences,
} from "../../src/reader/timing";
import { chapters } from "../../src/story/chapters";

describe("readingSeconds", () => {
	test("не меньше минимальной паузы", () => {
		for (const chapter of chapters) {
			expect(readingSeconds(chapter)).toBeGreaterThanOrEqual(
				MIN_READING_SECONDS,
			);
		}
	});

	test("длинной главе — больше времени", () => {
		const long = {
			id: "x",
			title: "Т",
			paragraphs: [Array(200).fill("слово").join(" ")],
		};
		expect(readingSeconds(long)).toBeGreaterThan(MIN_READING_SECONDS * 3);
	});
});

describe("easeInOutCubic", () => {
	test("от 0 до 1, монотонно, симметрично", () => {
		expect(easeInOutCubic(0)).toBe(0);
		expect(easeInOutCubic(1)).toBe(1);
		expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
		let prev = 0;
		for (let t = 0; t <= 1; t += 0.01) {
			expect(easeInOutCubic(t)).toBeGreaterThanOrEqual(prev);
			prev = easeInOutCubic(t);
		}
	});
});

describe("splitSentences", () => {
	test("делит по точкам, восклицаниям и многоточиям, сохраняя кавычки", () => {
		expect(
			splitSentences(
				"Однажды погасли огни. «Ступай к Бабе Яге за огнём!» — закричали сёстры.",
			),
		).toEqual([
			"Однажды погасли огни.",
			"«Ступай к Бабе Яге за огнём!»",
			"— закричали сёстры.",
		]);
	});

	test("хвост без точки не теряется", () => {
		expect(splitSentences("Раз. Два")).toEqual(["Раз.", "Два"]);
	});
});
