import {create} from "zustand";

import {readStored, writeStored} from "../lib/storage";

const STORAGE_KEY = "izbushka:sound";

interface AudioState {
	/** Пользователь включил звук. Браузер разрешит его только после клика. */
	enabled: boolean;
	/** Пользователь включал звук в прошлый раз — подскажем кнопкой. */
	preferred: boolean;
	setEnabled: (enabled: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
	enabled: false,
	preferred: readStored(STORAGE_KEY) === "on",
	setEnabled: (enabled) => {
		writeStored(STORAGE_KEY, enabled ? "on" : "off");
		set({enabled, preferred: enabled});
	},
}));
