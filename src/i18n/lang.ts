import { create } from "zustand";

export type Lang = "ru" | "en";

const LANG_KEY = "izbushka:lang";

function initialLang(): Lang {
	if (typeof window === "undefined") return "ru";
	try {
		const saved = window.localStorage.getItem(LANG_KEY);
		if (saved === "ru" || saved === "en") return saved;
	} catch {
		// хранилище недоступно — берём язык браузера
	}
	return window.navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
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
