import { create } from "zustand";

function initialTime(): number {
	if (typeof window === "undefined") return 19;
	const fromUrl = Number.parseFloat(
		new URLSearchParams(window.location.search).get("time") ?? "",
	);
	return Number.isFinite(fromUrl) ? fromUrl : 19;
}

interface SceneState {
	/** Время суток, часы 0..24. Управляется прокруткой (CameraRig), ?time=HH фиксирует. */
	timeOfDay: number;
	/** Сила ветра, 0..1. */
	wind: number;
	setTimeOfDay: (hours: number) => void;
	setWind: (wind: number) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
	timeOfDay: initialTime(),
	wind: 0.5,
	setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
	setWind: (wind) => set({ wind }),
}));

// Доступ к состоянию сцены (время суток, ветер) для e2e-тестов и отладки.
if (typeof window !== "undefined") {
	Object.assign(window, { __SCENE__: useSceneStore });
}
