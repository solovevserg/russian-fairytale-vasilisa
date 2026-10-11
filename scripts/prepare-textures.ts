/**
 * Скачивает текстуры земли с Poly Haven (CC0) и перекодирует в WebP
 * (public/textures/ground).
 *
 *   bun run textures:prepare
 *
 * Берём карты цвета и нормалей (OpenGL); трава и тропа — 2K (видны крупным
 * планом), лесная подстилка — 1K.
 */
import {spawnSync} from "node:child_process";
import {existsSync, mkdirSync, unlinkSync, writeFileSync} from "node:fs";
import {join} from "node:path";

import ffmpegPath from "ffmpeg-static";

const OUT = "public/textures/ground";

/** Имя в проекте → id на Poly Haven и разрешение (крупные планы — 2K). */
const TEXTURES: Record<string, {id: string; resolution: "1k" | "2k"}> = {
	grass: {id: "sparse_grass", resolution: "2k"},
	forest: {id: "forrest_ground_01", resolution: "1k"},
	path: {id: "forest_ground_04", resolution: "2k"},
};

const MAPS = {diff: "Diffuse", nor: "nor_gl"} as const;

interface PolyHavenFiles {
	[map: string]: {[resolution: string]: {jpg?: {url: string}}};
}

/** JPEG → WebP: в 3–5 раз легче при том же виде; нормали — с качеством повыше. */
function toWebp(
	source: string,
	target: string,
	quality: number,
	maxSize?: number,
) {
	if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");
	const resize = maxSize ? ["-vf", `scale='min(${maxSize},iw)':-1`] : [];
	const result = spawnSync(
		ffmpegPath,
		[
			"-y",
			"-loglevel",
			"error",
			"-i",
			source,
			...resize,
			"-c:v",
			"libwebp",
			"-quality",
			String(quality),
			target,
		],
		{stdio: "inherit"},
	);
	if (result.status !== 0) throw new Error(`ffmpeg failed for ${source}`);
}

mkdirSync(OUT, {recursive: true});
for (const [name, {id, resolution}] of Object.entries(TEXTURES)) {
	const files = (await (
		await fetch(`https://api.polyhaven.com/files/${id}`, {
			headers: {
				"User-Agent":
					"izbushka-texture-prep/1.0 (https://github.com/solovevserg/russian-fairytale-vasilisa)",
			},
		})
	).json()) as PolyHavenFiles;
	for (const [suffix, map] of Object.entries(MAPS)) {
		const target = join(OUT, `${name}_${suffix}.webp`);
		if (existsSync(target)) continue;
		const source = join(OUT, `${name}_${suffix}.jpg`);
		const url = files[map]?.[resolution]?.jpg?.url;
		if (!url) throw new Error(`${id}: нет карты ${map} ${resolution}`);
		console.log(`↓ ${url}`);
		writeFileSync(
			source,
			new Uint8Array(await (await fetch(url)).arrayBuffer()),
		);
		// нормалям хватает 1K: мелкий рельеф всё равно даёт карта цвета
		if (suffix === "nor") toWebp(source, target, 88, 1024);
		else toWebp(source, target, 82);
		unlinkSync(source);
	}
	console.log(`✓ ${name} ← ${id}`);
}
