import {create} from "zustand";

import {writeStored} from "../lib/storage";

export type Theme = "light" | "dark";

/** Ключ хранилища; та же логика продублирована во встроенном скрипте index.html. */
export const THEME_KEY = "izbushka:theme";

function initialTheme(): Theme {
	if (typeof document === "undefined") return "light";
	return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

interface ThemeState {
	theme: Theme;
	toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
	theme: initialTheme(),
	toggle: () => {
		const theme: Theme = get().theme === "dark" ? "light" : "dark";
		document.documentElement.dataset.theme = theme;
		writeStored(THEME_KEY, theme);
		set({theme});
	},
}));
