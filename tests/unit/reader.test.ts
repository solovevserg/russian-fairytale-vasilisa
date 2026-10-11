import { describe, expect, test } from "bun:test";

import { easeInOutCubic } from "../../src/lib/easing";
import {
	MIN_READING_SECONDS,
	readingSeconds,
	splitSentences,
} from "../../src/reader/timing";
import { chapters } from "../../src/story/chapters";

describe("readingSeconds", () => {
	test("китайский текст без пробелов читается не мгновенно", () => {
		const zh = { id: "x", title: "", paragraphs: ["字".repeat(150)] };
		expect(readingSeconds(zh)).toBeGreaterThan(MIN_READING_SECONDS * 2);
	});

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

	test("понимает китайскую пунктуацию", () => {
		expect(splitSentences("太阳升起来了。“去取火！”她喊道。")).toEqual([
			"太阳升起来了。",
			"“去取火！”",
			"她喊道。",
		]);
	});
});
