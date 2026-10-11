import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import {join} from "node:path";

import {CHAPTER_IDS} from "../../src/story/chapters";
import {SCENES} from "../../src/story/scenes";
import type {MusicTrack} from "../../src/story/types";

/** Как темы называются в таблице сценария. */
const MUSIC_NAMES: Record<MusicTrack, string> = {
	castle: "Il vecchio castello",
	catacombs: "Catacombae",
	"cum-mortuis": "Cum mortuis",
	hut: "Избушка на курьих ножках",
};

/** Часы 0..24 → «5:18». */
function clock(hours: number): string {
	const minutes = Math.round(hours * 60);
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

const scenario = readFileSync(
	join(import.meta.dir, "../../docs/scenario.md"),
	"utf8",
);
/** Строки таблицы глав: id → ячейки. */
const rows = new Map(
	scenario
		.split("\n")
		.map((line) => line.split("|").map((cell) => cell.trim()))
		.filter((cells) => /^`[\w-]+`$/.test(cells[2] ?? ""))
		.map((cells) => [cells[2].slice(1, -1), cells]),
);

describe("docs/scenario.md совпадает с кадрами глав", () => {
	test("каждая глава в таблице, по порядку", () => {
		expect([...rows.keys()]).toEqual([...CHAPTER_IDS]);
	});

	for (const id of CHAPTER_IDS) {
		test(`${id}: время и музыка`, () => {
			const cells = rows.get(id) ?? [];
			expect(cells[4]).toStartWith(clock(SCENES[id].timeOfDay));
			expect(cells[7]).toBe(MUSIC_NAMES[SCENES[id].music.track]);
		});
	}
});
