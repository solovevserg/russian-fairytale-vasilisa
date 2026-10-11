import {create} from "zustand";

import {urlNumber} from "../lib/url";

/** Время суток при открытии, если не задано в адресе (?time=HH). */
const DEFAULT_TIME = 19;

interface SceneState {
	/** Время суток, часы 0..24. Управляется прокруткой (CameraRig), ?time=HH фиксирует. */
	timeOfDay: number;
	/** Сила ветра, 0..1. */
	wind: number;
	setTimeOfDay: (hours: number) => void;
	setWind: (wind: number) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
	timeOfDay: urlNumber("time") ?? DEFAULT_TIME,
	wind: 0.5,
	setTimeOfDay: (timeOfDay) => set({timeOfDay}),
	setWind: (wind) => set({wind}),
}));

// Доступ к состоянию сцены (время суток, ветер) для e2e-тестов и отладки.
if (typeof window !== "undefined") {
	Object.assign(window, {__SCENE__: useSceneStore});
}
