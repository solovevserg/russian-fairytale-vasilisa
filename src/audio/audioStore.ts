import { create } from "zustand";

const STORAGE_KEY = "izbushka:sound";

function readPreference(): boolean {
	try {
		return window.localStorage.getItem(STORAGE_KEY) === "on";
	} catch {
		return false;
	}
}

function writePreference(enabled: boolean) {
	try {
		window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
	} catch {
		// приватный режим / заблокированное хранилище — просто не запоминаем
	}
}

interface AudioState {
	/** Пользователь включил звук. Браузер разрешит его только после клика. */
	enabled: boolean;
	/** Пользователь включал звук в прошлый раз — подскажем кнопкой. */
	preferred: boolean;
	setEnabled: (enabled: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
	enabled: false,
	preferred: typeof window !== "undefined" && readPreference(),
	setEnabled: (enabled) => {
		writePreference(enabled);
		set({ enabled, preferred: enabled });
	},
}));
