import {progressFromAnchors} from "./timeline";

/** Где читатель в тексте: от этого зависят сцена, навигация и подсказки. */
export interface ReadingPosition {
	/** Прогресс истории: дробный индекс главы 0..N-1. */
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
}

/** Положения карточек вдоль оси прокрутки (их середины), px. */
export interface ReadingAnchors {
	/** Середины глав по порядку. */
	chapters: number[];
	/** Середина титульной карточки. */
	start: number;
	/** Середина финальной карточки (титры). */
	credits: number;
}

/** Положение в самом начале: титульная карточка. */
export const START_POSITION: ReadingPosition = {
	progress: 0,
	activeChapter: 0,
	title: 1,
	credits: 0,
	edge: "start",
};

/**
 * Положение чтения по середине видимой области `focus` (px вдоль оси
 * прокрутки): прогресс между серединами глав, а до пролога и после эпилога —
 * доля пути к титульной и финальной карточкам.
 */
export function readingPosition(
	{chapters, start, credits}: ReadingAnchors,
	focus: number,
): ReadingPosition {
	const first = chapters[0] ?? 0;
	const last = chapters.at(-1) ?? 0;
	// до пролога — титул: 1 на нём, 0 на прологе
	const title =
		focus >= first || first <= start
			? 0
			: Math.min((first - focus) / (first - start), 1);
	// после эпилога — к титрам: 0 на эпилоге, 1 на титрах
	const toCredits =
		focus <= last || credits <= last
			? 0
			: Math.min((focus - last) / (credits - last), 1);
	const edge =
		title > 0.5
			? "start"
			: credits > last && focus > (last + credits) / 2
				? "credits"
				: null;
	const progress = progressFromAnchors(chapters, focus);
	return {
		progress,
		activeChapter: Math.round(progress),
		title,
		credits: toCredits,
		edge,
	};
}
