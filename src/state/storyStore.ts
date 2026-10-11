import {create} from "zustand";

import {type ReadingPosition, START_POSITION} from "../story/readingPosition";

interface StoryState extends ReadingPosition {
	/** Новое положение чтения (useScrollProgress). */
	setPosition: (position: ReadingPosition) => void;
}

/** Где читатель в тексте (см. ReadingPosition). */
export const useStoryStore = create<StoryState>((set) => ({
	...START_POSITION,
	setPosition: (position) => set(position),
}));

// Доступ к состоянию истории для e2e-тестов и отладки из консоли.
if (typeof window !== "undefined") {
	Object.assign(window, {__STORY__: useStoryStore});
}
