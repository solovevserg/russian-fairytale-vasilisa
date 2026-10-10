import { create } from "zustand";

interface StoryState {
	/** Прогресс истории по прокрутке: дробный индекс главы 0..N-1. */
	progress: number;
	/** Индекс главы, которая сейчас в фокусе. */
	activeChapter: number;
	setProgress: (progress: number) => void;
}

export const useStoryStore = create<StoryState>((set) => ({
	progress: 0,
	activeChapter: 0,
	setProgress: (progress) =>
		set({ progress, activeChapter: Math.round(progress) }),
}));

// Доступ к состоянию истории для e2e-тестов и отладки из консоли.
if (typeof window !== "undefined") {
	Object.assign(window, { __STORY__: useStoryStore });
}
