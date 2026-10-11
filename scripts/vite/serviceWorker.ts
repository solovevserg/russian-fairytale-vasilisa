import {createHash} from "node:crypto";
import {readdirSync, readFileSync} from "node:fs";
import {join, relative} from "node:path";

import type {Plugin} from "vite";

import type {SwManifest} from "../../src/sw/policy";

/** Сам воркер в список не входит. */
const SKIP = /^sw\.js$/;
/** Оболочка — кладётся в кэш при установке воркера. */
const SHELL = /\.(html|js|css)$/;

function hash(content: string | Uint8Array): string {
	return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/** Все файлы каталога рекурсивно — пути относительно него, через `/`. */
function walk(dir: string, root = dir): string[] {
	return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return walk(path, root);
		return [relative(root, path).replaceAll("\\", "/")];
	});
}

export interface ServiceWorkerOptions {
	/** Исходник воркера (путь в файловой системе); соберётся в `sw.js`. */
	entry: string;
}

/**
 * Собирает сервис-воркер в `sw.js` (в корне сайта, без хэша в имени — так
 * его находит браузер) и вшивает в него список файлов сборки и public/ с
 * хэшами содержимого (SwManifest, см. src/sw/policy.ts). Любое изменение
 * файла меняет sw.js — браузер ставит новую версию воркера, и тот
 * перекачивает изменённое, а устаревшее удаляет.
 */
export function serviceWorker({entry}: ServiceWorkerOptions): Plugin {
	let publicDir = "";
	return {
		name: "service-worker",
		apply: "build",
		enforce: "post",
		configResolved(config) {
			publicDir = config.publicDir;
		},
		buildStart() {
			this.emitFile({type: "chunk", id: entry, fileName: "sw.js"});
		},
		generateBundle(_, bundle) {
			const manifest: SwManifest = {shell: [], files: {}};
			for (const [fileName, item] of Object.entries(bundle)) {
				if (SKIP.test(fileName)) continue;
				manifest.files[fileName] = hash(
					item.type === "chunk" ? item.code : item.source,
				);
				if (SHELL.test(fileName)) manifest.shell.push(fileName);
			}
			for (const file of publicDir ? walk(publicDir) : []) {
				if (SKIP.test(file)) continue;
				manifest.files[file] = hash(readFileSync(join(publicDir, file)));
			}
			const sw = bundle["sw.js"];
			if (sw?.type !== "chunk") throw new Error("sw.js не собран");
			// воркер грузится как обычный скрипт — импортов в нём быть не должно
			if (sw.imports.length > 0 || sw.dynamicImports.length > 0) {
				throw new Error(`sw.js импортирует ${sw.imports.join(", ")}`);
			}
			if (!sw.code.includes("__SW_MANIFEST__")) {
				throw new Error("sw.js: нет места для списка файлов (__SW_MANIFEST__)");
			}
			sw.code = sw.code.replaceAll("__SW_MANIFEST__", JSON.stringify(manifest));
		},
	};
}
