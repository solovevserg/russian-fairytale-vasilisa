import { create } from "zustand";

const NARRATE_KEY = "izbushka:narrate";

function readNarrate(): boolean {
	try {
		// по умолчанию включена; выключается явным выбором пользователя
		return window.localStorage.getItem(NARRATE_KEY) !== "off";
	} catch {
		return true;
	}
}

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
	narrate: typeof window !== "undefined" && readNarrate(),
	speaking: null,
	setPlaying: (playing) => set({ playing }),
	setNarrate: (narrate) => {
		try {
			window.localStorage.setItem(NARRATE_KEY, narrate ? "on" : "off");
		} catch {
			// хранилище недоступно — просто не запоминаем
		}
		set({ narrate });
	},
	setSpeaking: (speaking) => set({ speaking }),
}));
