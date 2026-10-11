import { create } from "zustand";

import { readStored, writeStored } from "../lib/storage";

const NARRATE_KEY = "izbushka:narrate";

interface ReaderState {
	/** Идёт автоматическое чтение (прокрутка от главы к главе). */
	playing: boolean;
	/** Читать главы вслух. */
	narrate: boolean;
	/** Абзац, который сейчас звучит: [глава, абзац] — для подсветки. */
	speaking: [number, number] | null;
	setPlaying: (playing: boolean) => void;
	setNarrate: (narrate: boolean) => void;
	setSpeaking: (speaking: [number, number] | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
	playing: false,
	// по умолчанию включена; выключается явным выбором пользователя
	narrate: typeof window !== "undefined" && readStored(NARRATE_KEY) !== "off",
	speaking: null,
	setPlaying: (playing) => set({ playing }),
	setNarrate: (narrate) => {
		writeStored(NARRATE_KEY, narrate ? "on" : "off");
		set({ narrate });
	},
	setSpeaking: (speaking) => set({ speaking }),
}));
