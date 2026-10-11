import sharp from "sharp";
import type {Plugin} from "vite";

/**
 * Текстуры ez-tree, которые нужны сцене: породы коры и листвы наших пресетов
 * (src/scene/forest/variants.ts и кусты в Vegetation.tsx; сверяется
 * юнит-тестом tests/unit/ezTreeTextures.test.ts). Карты шероховатости не
 * нужны никогда: материал веток — MeshPhongMaterial, он их не читает.
 */
export const EZ_TREE_TEXTURES = {
	bark: ["birch", "oak", "pine"],
	barkMaps: ["ao", "color", "normal"],
	leaves: ["ash", "aspen", "oak", "pine"],
} as const;

/** Прозрачная PNG 1×1 — вместо текстур, которые сцене не нужны. */
const EMPTY_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Качество WebP: карты нормалей и ao чувствительнее к артефактам, чем цвет. */
const WEBP_QUALITY = {color: 82, leaves: 85, normal: 90, ao: 80} as const;

const EZ_TREE_ID = /@dgreenheck[\\/]ez-tree[\\/]build[\\/]ez-tree\.es\.js$/;
const DATA_URI =
	/(\$?\w+) = "data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)"/g;

/** Имена всех нужных текстур: bark-oak-color, leaves-pine… */
export function neededTextures(): string[] {
	const {bark, barkMaps, leaves} = EZ_TREE_TEXTURES;
	return [
		...bark.flatMap((type) => barkMaps.map((map) => `bark-${type}-${map}`)),
		...leaves.map((type) => `leaves-${type}`),
	];
}

/**
 * Таблица текстур в коде ez-tree —
 * `bark: {birch: {ao: j(VB, !1), …}, …}, leaves: {ash: j(ME), …}` —
 * как «переменная с data-URI → имя текстуры» (bark-birch-ao, leaves-ash…).
 */
function textureTable(code: string): Map<string, string> {
	const start = code.indexOf("bark: {\n    birch:");
	const end = code.indexOf("class ", start);
	if (start < 0 || end < 0) {
		throw new Error("ez-tree: не найдена таблица текстур");
	}
	const table = code.slice(start + "bark: {".length, end);
	const [barkPart, leavesPart = ""] = table.split(/\n {2}leaves: \{/);
	const byVariable = new Map<string, string>();
	for (const [, type, maps] of barkPart.matchAll(/(\w+): \{([^}]*)\}/g)) {
		for (const [, map, variable] of maps.matchAll(/(\w+): j\((\$?\w+)/g)) {
			byVariable.set(variable, `bark-${type}-${map}`);
		}
	}
	for (const [, type, variable] of leavesPart.matchAll(
		/(\w+): j\((\$?\w+)\)/g,
	)) {
		byVariable.set(variable, `leaves-${type}`);
	}
	const known = new Set(byVariable.values());
	const missing = neededTextures().filter((name) => !known.has(name));
	if (missing.length > 0) {
		throw new Error(`ez-tree: в библиотеке нет текстур ${missing.join(", ")}`);
	}
	return byVariable;
}

function webpQuality(name: string): number {
	if (name.startsWith("leaves")) return WEBP_QUALITY.leaves;
	const map = name.split("-")[2] as keyof typeof WEBP_QUALITY;
	return WEBP_QUALITY[map] ?? WEBP_QUALITY.color;
}

/** Текстура в WebP, если так меньше: JPEG коры в ez-tree уже сильно сжаты. */
async function smallest(
	original: Buffer,
	format: string,
	quality: number,
): Promise<{source: Buffer; extension: string}> {
	const webp = await sharp(original)
		.webp({quality, alphaQuality: 90})
		.toBuffer();
	if (webp.length < original.length) return {source: webp, extension: "webp"};
	return {source: original, extension: format === "jpeg" ? "jpg" : format};
}

/** Наибольшая сторона облегчённых копий (для телефонов). */
const LIGHT_SIZE = 512;

/** Облегчённая копия текстуры: не больше LIGHT_SIZE, WebP. */
function lightCopy(original: Buffer, quality: number): Promise<Buffer> {
	return sharp(original)
		.resize(LIGHT_SIZE, LIGHT_SIZE, {fit: "inside", withoutEnlargement: true})
		.webp({quality, alphaQuality: 90})
		.toBuffer();
}

export interface EzTreeTexturesOptions {
	/**
	 * Модуль с настройками качества (путь в файловой системе): из его экспорта
	 * `quality.lightAssets` код ez-tree узнаёт, брать ли облегчённые копии.
	 */
	qualityModule: string;
	/**
	 * Модуль с `createBitmapTextureLoader()` — загрузчиком вместо
	 * TextureLoader: декодирует картинки в фоне (createImageBitmap).
	 */
	loaderModule: string;
}

/** Где ez-tree создаёт свой TextureLoader. */
const TEXTURE_LOADER = /(\w+) = new (\w+)\.TextureLoader\(\)/;

/**
 * ez-tree вшивает в свой код 20 текстур коры и листвы в base64 (~4 МБ) и при
 * импорте грузит их все. При сборке нужные текстуры выносятся отдельными
 * файлами (кэшируются и декодируются браузером отдельно от JS) — каждая в
 * двух размерах: полном и облегчённом (512, для телефонов; выбор — по
 * `quality.lightAssets`). Ненужные заменяются пустой картинкой — их не
 * качаем вовсе. Свой TextureLoader библиотеки заменяется загрузчиком,
 * который декодирует картинки в фоне (loaderModule). В dev-режиме
 * библиотека остаётся как есть.
 */
export function ezTreeTextures({
	qualityModule,
	loaderModule,
}: EzTreeTexturesOptions): Plugin {
	const path = (file: string) => JSON.stringify(file.replaceAll("\\", "/"));
	const imports = [
		`import {quality as __quality} from ${path(qualityModule)};`,
		`import {createBitmapTextureLoader as __loader} from ${path(loaderModule)};`,
		"",
	].join("\n");
	return {
		name: "ez-tree-textures",
		apply: "build",
		async transform(code, id) {
			if (!EZ_TREE_ID.test(id)) return null;
			const names = textureTable(code);
			const needed = new Set(neededTextures());
			const found = [...code.matchAll(DATA_URI)];
			if (found.length !== names.size) {
				throw new Error(
					`ez-tree: ${found.length} текстур в коде, ${names.size} в таблице — формат библиотеки изменился`,
				);
			}
			let result = code;
			for (const [whole, variable, format, base64] of found) {
				const name = names.get(variable);
				if (!name) {
					throw new Error(`ez-tree: текстура ${variable} не из таблицы`);
				}
				let replacement = `${variable} = "${EMPTY_PNG}"`;
				if (needed.has(name)) {
					const original = Buffer.from(base64, "base64");
					const quality = webpQuality(name);
					const full = await smallest(original, format, quality);
					const fullRef = this.emitFile({
						type: "asset",
						name: `ez-tree-${name}.${full.extension}`,
						source: full.source,
					});
					const lightRef = this.emitFile({
						type: "asset",
						name: `ez-tree-${name}-light.webp`,
						source: await lightCopy(original, quality),
					});
					replacement = `${variable} = __quality.lightAssets ? import.meta.ROLLUP_FILE_URL_${lightRef} : import.meta.ROLLUP_FILE_URL_${fullRef}`;
				}
				result = result.replace(whole, replacement);
			}
			if (!TEXTURE_LOADER.test(result)) {
				throw new Error(
					"ez-tree: не найден TextureLoader — формат библиотеки изменился",
				);
			}
			result = result.replace(TEXTURE_LOADER, "$1 = __loader()");
			return {code: imports + result, map: null};
		},
	};
}
