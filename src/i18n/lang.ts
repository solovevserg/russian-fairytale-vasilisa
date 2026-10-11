import {create} from "zustand";

import {readStored, writeStored} from "../lib/storage";
import {urlString} from "../lib/url";
import {type Lang, LOCALES} from "./locales/index";

export type {Lang} from "./locales/index";

/** Языки в меню: флаг и самоназвание — из файлов переводов (`language`). */
export const LANGS: {id: Lang; flag: string; name: string}[] = (
	Object.keys(LOCALES) as Lang[]
).map((id) => ({id, ...LOCALES[id].language}));

const LANG_KEY = "izbushka:lang";

function isLang(value: string | null): value is Lang {
	return LANGS.some((l) => l.id === value);
}

/** Первый из языков браузера, который у нас есть; иначе английский. */
export function pickLang(preferred: readonly string[]): Lang {
	for (const tag of preferred) {
		const base = tag.toLowerCase().slice(0, 2);
		if (isLang(base)) return base;
	}
	return "en";
}

function initialLang(): Lang {
	if (typeof window === "undefined") return "ru";
	// ?lang=en — ссылка на версию на языке (для поисковиков: hreflang)
	const linked = urlString("lang");
	if (isLang(linked)) return linked;
	const saved = readStored(LANG_KEY);
	if (isLang(saved)) return saved;
	const nav = window.navigator;
	return pickLang(nav.languages?.length ? nav.languages : [nav.language]);
}

interface LangState {
	lang: Lang;
	setLang: (lang: Lang) => void;
}

/** Язык интерфейса и текста. Переключается на лету, без перезагрузки. */
export const useLangStore = create<LangState>((set) => ({
	lang: initialLang(),
	setLang: (lang) => {
		writeStored(LANG_KEY, lang);
		set({lang});
	},
}));
