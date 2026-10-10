/**
 * Скачивает текстуры земли с Poly Haven (CC0) в public/textures/ground.
 *
 *   bun run textures:prepare
 *
 * Берём 1K-карты цвета и нормалей (OpenGL): этого хватает для земли под
 * плотной травой, а вес сборки остаётся небольшим.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "public/textures/ground";
const RESOLUTION = "1k";

/** Имя в проекте → id на Poly Haven */
const TEXTURES: Record<string, string> = {
	grass: "forrest_ground_01",
	forest: "forest_leaves_02",
	path: "brown_mud_02",
};

const MAPS = { diff: "Diffuse", nor: "nor_gl" } as const;

interface PolyHavenFiles {
	[map: string]: { [resolution: string]: { jpg?: { url: string } } };
}

mkdirSync(OUT, { recursive: true });
for (const [name, id] of Object.entries(TEXTURES)) {
	const files = (await (
		await fetch(`https://api.polyhaven.com/files/${id}`, {
			headers: { "User-Agent": "izbushka-texture-prep/1.0" },
		})
	).json()) as PolyHavenFiles;
	for (const [suffix, map] of Object.entries(MAPS)) {
		const target = join(OUT, `${name}_${suffix}.jpg`);
		if (existsSync(target)) continue;
		const url = files[map]?.[RESOLUTION]?.jpg?.url;
		if (!url) throw new Error(`${id}: нет карты ${map} ${RESOLUTION}`);
		console.log(`↓ ${url}`);
		writeFileSync(
			target,
			new Uint8Array(await (await fetch(url)).arrayBuffer()),
		);
	}
	console.log(`✓ ${name} ← ${id}`);
}
