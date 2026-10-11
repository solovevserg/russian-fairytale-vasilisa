import {create} from "zustand";

interface StoryState {
	/** Прогресс истории по прокрутке: дробный индекс главы 0..N-1. */
	progress: number;
	/** Индекс главы, которая сейчас в фокусе. */
	activeChapter: number;
	/**
	 * Насколько читатель ещё на титульной карточке (до пролога): 1 — на ней,
	 * 0 — на прологе и дальше.
	 */
	title: number;
	/** Насколько читатель ушёл с эпилога к титрам: 0 — эпилог, 1 — титры. */
	credits: number;
	/** В фокусе не глава, а начало (титул) или финальная карточка (титры). */
	edge: "start" | "credits" | null;
	setProgress: (
		progress: number,
		title?: number,
		edge?: "start" | "credits" | null,
		credits?: number,
	) => void;
}

export const useStoryStore = create<StoryState>((set) => ({
	progress: 0,
	activeChapter: 0,
	title: 1,
	credits: 0,
	edge: "start",
	setProgress: (progress, title = 0, edge = null, credits = 0) =>
		set({
			progress,
			activeChapter: Math.round(progress),
			title,
			edge,
			credits,
		}),
}));

// Доступ к состоянию истории для e2e-тестов и отладки из консоли.
if (typeof window !== "undefined") {
	Object.assign(window, {__STORY__: useStoryStore});
}
