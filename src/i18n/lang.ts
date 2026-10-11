import { create } from "zustand";

export type Lang = "ru" | "en" | "es" | "zh";

/** Языки в меню: флаг и самоназвание (не переводятся). */
export const LANGS: { id: Lang; flag: string; name: string }[] = [
	{ id: "ru", flag: "🇷🇺", name: "Русский" },
	{ id: "en", flag: "🇬🇧", name: "English" },
	{ id: "es", flag: "🇪🇸", name: "Español" },
	{ id: "zh", flag: "🇨🇳", name: "中文" },
];

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
	const linked = new URLSearchParams(window.location.search).get("lang");
	if (isLang(linked)) return linked;
	try {
		const saved = window.localStorage.getItem(LANG_KEY);
		if (isLang(saved)) return saved;
	} catch {
		// хранилище недоступно — берём язык браузера
	}
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
		try {
			window.localStorage.setItem(LANG_KEY, lang);
		} catch {
			// не запомнится — не страшно
		}
		set({ lang });
	},
}));
