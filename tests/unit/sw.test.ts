import {describe, expect, test} from "bun:test";

import {
	cacheKey,
	currentKeys,
	offlineFiles,
	parseRange,
	type SwManifest,
	strategyFor,
} from "../../src/sw/policy";

const manifest: SwManifest = {
	shell: ["index.html", "assets/index-abc.js"],
	files: {
		"index.html": "h1",
		"assets/index-abc.js": "j1",
		"models/hut.glb": "m1",
	},
};

describe("сервис-воркер: правила кэширования", () => {
	test("страница — из сети (новая выкладка видна сразу), без сети — из кэша", () => {
		expect(strategyFor("", manifest)).toBe("network-first");
		expect(strategyFor("index.html", manifest)).toBe("network-first");
	});

	test("файлы из списка — из кэша, звук — по кускам, неизвестное — мимо воркера", () => {
		const withAudio: SwManifest = {
			...manifest,
			files: {...manifest.files, "audio/music-hut.mp3": "a1"},
		};
		expect(strategyFor("models/hut.glb", withAudio)).toBe("cache-first");
		expect(strategyFor("assets/index-abc.js", withAudio)).toBe("cache-first");
		expect(strategyFor("audio/music-hut.mp3", withAudio)).toBe("media");
		expect(strategyFor("models/new.glb", withAudio)).toBe("bypass");
	});

	test("изменённый файл получает новый ключ, старый — устаревший", () => {
		const next: SwManifest = {
			...manifest,
			files: {...manifest.files, "models/hut.glb": "m2"},
		};
		expect(cacheKey("models/hut.glb", next)).not.toBe(
			cacheKey("models/hut.glb", manifest),
		);
		expect(currentKeys(next).has(cacheKey("models/hut.glb", manifest))).toBe(
			false,
		);
		expect(currentKeys(next).has(cacheKey("index.html", manifest))).toBe(true);
	});
});

describe("сервис-воркер: что докачать для работы без сети", () => {
	const site: SwManifest = {
		shell: [],
		files: Object.fromEntries(
			[
				"index.html",
				"assets/index-abc.js",
				"assets/font-cyrillic.woff2",
				"assets/font-cyrillic.woff",
				"assets/ez-tree-bark-oak-color-B_qaDh1U.webp",
				"assets/ez-tree-bark-oak-color-light-QrhOwWmo.webp",
				"assets/ez-tree-leaves-pine-BalfujR0.webp",
				"assets/ez-tree-leaves-pine-light-Dk2_x-a1.webp",
				"models/hut.glb",
				"models/hut-mobile.glb",
				"models/skull.glb",
				"textures/ground/grass_diff.webp",
				"textures/ground/mobile/grass_diff.webp",
				"audio/music-hut.webm",
				"audio/music-hut.mp3",
				"og-image.jpg",
				"sitemap.xml",
			].map((path) => [path, "r"]),
		),
	};

	test("телефону — облегчённые копии и его формат звука", () => {
		expect(offlineFiles(site, {light: true, audio: "webm"}).sort()).toEqual(
			[
				"index.html",
				"assets/index-abc.js",
				"assets/font-cyrillic.woff2",
				"assets/ez-tree-bark-oak-color-light-QrhOwWmo.webp",
				"assets/ez-tree-leaves-pine-light-Dk2_x-a1.webp",
				"models/hut-mobile.glb",
				"models/skull.glb",
				"textures/ground/mobile/grass_diff.webp",
				"audio/music-hut.webm",
			].sort(),
		);
	});

	test("компьютеру — полные версии", () => {
		const files = offlineFiles(site, {light: false, audio: "mp3"});
		expect(files).toContain("models/hut.glb");
		expect(files).toContain("models/skull.glb");
		expect(files).toContain("textures/ground/grass_diff.webp");
		expect(files).toContain("assets/ez-tree-bark-oak-color-B_qaDh1U.webp");
		expect(files).toContain("audio/music-hut.mp3");
		expect(files).not.toContain("models/hut-mobile.glb");
		expect(files).not.toContain("audio/music-hut.webm");
	});
});

describe("сервис-воркер: куски звука из кэша", () => {
	test("Range: от и до, от и до конца, последние n байт", () => {
		expect(parseRange("bytes=0-99", 1000)).toEqual({start: 0, end: 99});
		expect(parseRange("bytes=500-", 1000)).toEqual({start: 500, end: 999});
		expect(parseRange("bytes=-100", 1000)).toEqual({start: 900, end: 999});
		expect(parseRange("bytes=900-5000", 1000)).toEqual({start: 900, end: 999});
	});

	test("непонятный или пустой диапазон — null", () => {
		expect(parseRange("bytes=-", 1000)).toBeNull();
		expect(parseRange("items=0-1", 1000)).toBeNull();
		expect(parseRange("bytes=2000-", 1000)).toBeNull();
	});
});
