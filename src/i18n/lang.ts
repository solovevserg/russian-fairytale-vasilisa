import {useSyncExternalStore} from "react";
import {createStore} from "zustand";

import {readStored, writeStored} from "../lib/storage";
import {urlString} from "../lib/url";
import {type Lang, LOCALES} from "./locales/index";

export type {Lang} from "./locales/index";

/** Языки в меню: флаг и самоназвание — из файлов переводов (`language`). */
export const LANGS: {id: Lang; flag: string; name: string}[] = (
	Object.keys(LOCALES) as Lang[]
).map((id) => ({id, ...LOCALES[id].language}));

/** Ключ сохранённого выбора языка в localStorage. */
export const LANG_KEY = "izbushka:lang";

/** Коды языков (из LOCALES). */
export const LANG_IDS = Object.keys(LOCALES) as Lang[];

/**
 * Язык при открытии: из ссылки (`?lang=en` — для поисковиков, hreflang),
 * сохранённый выбор, первый из языков браузера, который у нас есть; иначе
 * английский.
 *
 * Самодостаточна — без ссылок на внешние имена: её исходник вставляется в
 * index.html при сборке (scripts/vite/prerender.ts), чтобы ещё до загрузки JS
 * показать готовый текст на нужном языке.
 */
export function chooseLang(
	ids: readonly string[],
	linked: string | null,
	saved: string | null,
	preferred: readonly string[],
): string {
	if (linked && ids.includes(linked)) return linked;
	if (saved && ids.includes(saved)) return saved;
	for (const tag of preferred) {
		const base = tag.toLowerCase().slice(0, 2);
		if (ids.includes(base)) return base;
	}
	return "en";
}

/** Первый из языков браузера, который у нас есть; иначе английский. */
export function pickLang(preferred: readonly string[]): Lang {
	return chooseLang(LANG_IDS, null, null, preferred) as Lang;
}

/** Язык при сборке (готовый текст в index.html) и вне браузера. */
export const DEFAULT_LANG: Lang = "ru";

function initialLang(): Lang {
	if (typeof window === "undefined") return DEFAULT_LANG;
	const nav = window.navigator;
	return chooseLang(
		LANG_IDS,
		urlString("lang"),
		readStored(LANG_KEY),
		nav.languages?.length ? nav.languages : [nav.language],
	) as Lang;
}

interface LangState {
	lang: Lang;
	setLang: (lang: Lang) => void;
}

const langStore = createStore<LangState>((set) => ({
	lang: initialLang(),
	setLang: (lang) => {
		writeStored(LANG_KEY, lang);
		set({lang});
	},
}));

/**
 * Язык интерфейса и текста. Переключается на лету, без перезагрузки.
 *
 * Хук сделан на useSyncExternalStore, а не на `create` из zustand: тот при
 * рендере на сервере берёт начальное состояние, а пререндеру (src/ssg)
 * нужно текущее — он рендерит страницу на каждом языке по очереди.
 */
export const useLangStore = Object.assign(
	<T>(selector: (state: LangState) => T): T => {
		const snapshot = () => selector(langStore.getState());
		return useSyncExternalStore(langStore.subscribe, snapshot, snapshot);
	},
	langStore,
);
