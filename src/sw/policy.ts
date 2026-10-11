/**
 * Список файлов сайта для сервис-воркера; его вшивает в sw.js при сборке
 * scripts/vite/serviceWorker.ts. Пути — относительно корня сайта (base).
 */
export interface SwManifest {
	/** Оболочка — кладётся в кэш при установке: HTML, JS, CSS. */
	shell: string[];
	/** Все файлы, которые можно кэшировать: путь → хэш содержимого. */
	files: Record<string, string>;
}

/** Что нужно этому устройству (сообщает страница, см. register.ts). */
export interface DeviceAssets {
	/** Облегчённые ресурсы (quality.lightAssets). */
	light: boolean;
	/** Формат звука, который выбрал браузер. */
	audio: "webm" | "mp3";
}

/** Сообщение страницы воркеру: докачать всё нужное устройству для работы без сети. */
export interface WarmMessage {
	type: "warm";
	device: DeviceAssets;
}

/**
 * Как отдавать файл:
 * - `network-first` — страница: свежая из сети, без сети — из кэша;
 * - `cache-first` — файлы из списка: из кэша, пока не изменился их хэш;
 * - `media` — звук: `<audio>` грузит его кусками (Range-запросами); если файл
 *   уже скачан целиком — кусок вырезается из кэша, иначе — из сети;
 * - `bypass` — мимо воркера: всё, чего нет в списке.
 */
export type Strategy = "network-first" | "cache-first" | "media" | "bypass";

/** Страница сайта (корень — тот же index.html). */
export const PAGE = "index.html";

/** Стратегия для пути относительно корня сайта. */
export function strategyFor(path: string, manifest: SwManifest): Strategy {
	if (path === "" || path === PAGE) return "network-first";
	if (!(path in manifest.files)) return "bypass";
	return path.startsWith("audio/") ? "media" : "cache-first";
}

/**
 * Ключ файла в кэше — с хэшем содержимого: изменённый файл (например,
 * пересобранная модель с тем же именем) получает новый ключ и качается
 * заново, а старый удаляется при обновлении воркера.
 */
export function cacheKey(path: string, manifest: SwManifest): string {
	return `${path}?rev=${manifest.files[path] ?? ""}`;
}

/** Ключи всех файлов текущей версии — остальные в кэше устарели. */
export function currentKeys(manifest: SwManifest): Set<string> {
	return new Set(
		Object.keys(manifest.files).map((path) => cacheKey(path, manifest)),
	);
}

/**
 * Файлы, у которых есть облегчённая копия: группа (общая для обеих копий) и
 * какая это копия. Модели `x.glb` / `x-mobile.glb`, текстуры земли
 * `ground/x` / `ground/mobile/x`, текстуры деревьев `ez-tree-<имя>-<хэш>` /
 * `ez-tree-<имя>-light-<хэш>`.
 */
const VARIANTS = [
	/^models\/(?<name>.+?)(?<light>-mobile)?\.glb$/,
	/^textures\/ground\/(?<light>mobile\/)?(?<name>.+)$/,
	/^assets\/ez-tree-(?<name>bark-\w+-\w+|leaves-\w+)(?<light>-light)?-/,
];

function variantOf(path: string): {group: string; light: boolean} | null {
	for (const [i, pattern] of VARIANTS.entries()) {
		const groups = path.match(pattern)?.groups;
		if (groups) {
			return {group: `${i}:${groups.name}`, light: groups.light !== undefined};
		}
	}
	return null;
}

/** Что сайту без сети не нужно: старый формат шрифтов, превью для соцсетей, файлы для поисковиков. */
const NOT_FOR_OFFLINE = /\.woff$|^og-image\.|^robots\.txt$|^sitemap\.xml$/;

/**
 * Всё, что нужно этому устройству для работы без сети: из файлов с
 * облегчённой копией — только нужная копия, из звука — только нужный формат.
 */
export function offlineFiles(
	manifest: SwManifest,
	device: DeviceAssets,
): string[] {
	const paths = Object.keys(manifest.files);
	const groups = new Map<string, boolean[]>();
	for (const path of paths) {
		const v = variantOf(path);
		if (v) groups.set(v.group, [...(groups.get(v.group) ?? []), v.light]);
	}
	return paths.filter((path) => {
		if (NOT_FOR_OFFLINE.test(path)) return false;
		const audio = path.match(/^audio\/.+\.(webm|mp3)$/);
		if (audio) return audio[1] === device.audio;
		const v = variantOf(path);
		// у файла нет второй копии — он нужен всем
		if (!v || new Set(groups.get(v.group)).size < 2) return true;
		return v.light === device.light;
	});
}

/**
 * Диапазон байтов из заголовка Range (`bytes=100-`, `bytes=100-199`,
 * `bytes=-500`) для файла длиной `size`; null — заголовок не понят.
 */
export function parseRange(
	header: string,
	size: number,
): {start: number; end: number} | null {
	const m = header.match(/^bytes=(\d*)-(\d*)$/);
	if (!m || (m[1] === "" && m[2] === "")) return null;
	if (m[1] === "") {
		const length = Math.min(Number(m[2]), size);
		return {start: size - length, end: size - 1};
	}
	const start = Number(m[1]);
	const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
	return start <= end ? {start, end} : null;
}
