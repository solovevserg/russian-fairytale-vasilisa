/**
 * Готовит звук для сайта: скачивает исходники (кеш в .cache/audio-src),
 * нормализует громкость и кодирует в Opus/WebM + MP3 (запасной для старых Safari).
 *
 *   bun run audio:prepare
 *
 * Лицензии и авторы — в docs/assets.md.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { unzipSync } from "fflate";
import ffmpegPath from "ffmpeg-static";

const CACHE = ".cache/audio-src";
const OUT = "public/audio";
const WOOD_PACK =
	"https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip";
const COMMONS = "https://upload.wikimedia.org/wikipedia/commons";

interface Source {
	/** Имя результата: public/audio/<name>.webm|.mp3 */
	name: string;
	/** URL файла или `zip:<путь внутри WOOD_PACK>` */
	url: string;
	kind: "music" | "loop" | "sfx";
	mono?: boolean;
	/** Обрезка: [начало, длительность] в секундах */
	trim?: [number, number];
}

const SOURCES: Source[] = [
	// Мусоргский, «Картинки с выставки» (Musopen, public domain)
	{
		name: "music-castle",
		kind: "music",
		url: `${COMMONS}/5/5f/Modest_Mussorgsky_-_pictures_at_an_exhibition_-_ii._il_vecchio_castello_-_andante.ogg`,
	},
	{
		name: "music-catacombs",
		kind: "music",
		url: `${COMMONS}/0/08/Modest_Mussorgsky_-_pictures_at_an_exhibition_-_viii._catacombae._sepulcrum_romanum_-_largo.ogg`,
	},
	{
		name: "music-cum-mortuis",
		kind: "music",
		url: `${COMMONS}/9/9a/Modest_Mussorgsky_-_pictures_at_an_exhibition_-_cum_mortuis_in_lingua_mortua_-_andante_non_troppo%2C_con_lamento.ogg`,
	},
	{
		name: "music-hut",
		kind: "music",
		url: `${COMMONS}/7/79/Modest_Mussorgsky_-_pictures_at_an_exhibition_-_ix._la_cabane_sur_des_pattes_de_poule_-_allegro_con_brio%2C_feroce_-_andante_mosso_-_allegro_molto.ogg`,
	},
	// Эмбиент (CC0)
	{
		name: "amb-forest-day",
		kind: "loop",
		url: "https://opengameart.org/sites/default/files/Forest_Ambience.mp3",
	},
	{
		name: "amb-crickets",
		kind: "loop",
		url: "https://opengameart.org/sites/default/files/crickets_1.mp3",
	},
	{
		name: "amb-wind",
		kind: "loop",
		url: "https://opengameart.org/sites/default/files/wind%20woosh%20loop.ogg",
	},
	// Разовые звуки (CC0)
	{
		name: "sfx-owl",
		kind: "sfx",
		mono: true,
		url: "https://bigsoundbank.com/UPLOAD/mp3/1763.mp3",
	},
	{
		name: "sfx-tree-creak",
		kind: "sfx",
		mono: true,
		url: "https://opengameart.org/sites/default/files/tree_creak_0.ogg",
	},
	{
		name: "sfx-crack-1",
		kind: "sfx",
		mono: true,
		url: "zip:wood_cracking_01.ogg",
	},
	{
		name: "sfx-crack-2",
		kind: "sfx",
		mono: true,
		url: "zip:wood_cracking_02.ogg",
	},
	{
		name: "sfx-crack-3",
		kind: "sfx",
		mono: true,
		url: "zip:wood_cracking_03.ogg",
	},
	{
		name: "sfx-crack-4",
		kind: "sfx",
		mono: true,
		url: "zip:wood_cracking_04.ogg",
	},
	{
		name: "sfx-hut-creak-1",
		kind: "sfx",
		mono: true,
		url: "zip:wood_squeak_01.ogg",
	},
	{
		name: "sfx-hut-creak-2",
		kind: "sfx",
		mono: true,
		url: "zip:wood_squeak_02.ogg",
	},
];

/** Целевая громкость (LUFS) и битрейт по типу звука. */
const ENCODING = {
	music: { lufs: -20, opus: "64k", mp3: "96k" },
	loop: { lufs: -24, opus: "48k", mp3: "80k" },
	sfx: { lufs: -18, opus: "48k", mp3: "80k" },
} as const;

async function download(url: string, file: string) {
	if (existsSync(file)) return;
	console.log(`↓ ${url}`);
	const response = await fetch(url, {
		headers: {
			// Wikimedia требует описательный User-Agent: https://meta.wikimedia.org/wiki/User-Agent_policy
			"User-Agent":
				"izbushka-audio-prep/1.0 (https://github.com/solovevserg/russian-fairytale-vasilisa)",
		},
	});
	if (!response.ok) throw new Error(`${response.status} ${url}`);
	writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
}

async function resolveSource(source: Source): Promise<string> {
	if (source.url.startsWith("zip:")) {
		const entry = source.url.slice(4);
		const file = join(CACHE, entry);
		if (!existsSync(file)) {
			const zip = join(CACHE, "wood-sfx.zip");
			await download(WOOD_PACK, zip);
			const files = unzipSync(readFileSync(zip));
			const data = Object.entries(files).find(([path]) =>
				path.endsWith(entry),
			)?.[1];
			if (!data) throw new Error(`${entry} not found in ${WOOD_PACK}`);
			writeFileSync(file, data);
		}
		return file;
	}
	const ext = source.url.split(".").pop()?.split("?")[0] ?? "bin";
	const file = join(CACHE, `${source.name}.${ext}`);
	await download(source.url, file);
	return file;
}

function encode(input: string, source: Source) {
	if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");
	const { lufs, opus, mp3 } = ENCODING[source.kind];
	const filters = [`loudnorm=I=${lufs}:TP=-2:LRA=11`];
	const common = [
		"-y",
		"-loglevel",
		"error",
		...(source.trim
			? ["-ss", String(source.trim[0]), "-t", String(source.trim[1])]
			: []),
		"-i",
		input,
		"-af",
		filters.join(","),
		"-ac",
		source.mono ? "1" : "2",
		"-ar",
		"48000",
		"-map_metadata",
		"-1",
	];
	const targets = [
		["-c:a", "libopus", "-b:a", opus, join(OUT, `${source.name}.webm`)],
		["-c:a", "libmp3lame", "-b:a", mp3, join(OUT, `${source.name}.mp3`)],
	];
	for (const target of targets) {
		const result = spawnSync(ffmpegPath, [...common, ...target], {
			stdio: "inherit",
		});
		if (result.status !== 0)
			throw new Error(`ffmpeg failed for ${source.name}`);
	}
	console.log(`✓ ${source.name}`);
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });
for (const source of SOURCES) {
	encode(await resolveSource(source), source);
}
