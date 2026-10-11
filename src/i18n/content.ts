import {CHAPTER_IDS} from "../story/chapters";
import {type Lang, useLangStore} from "./lang";
import {LOCALES} from "./locales/index";
import type {Chapter, Locale} from "./types";

export type {Chapter, ChapterText, Locale} from "./types";

/** Тексты сказки и интерфейса на одном языке — перевод и выведенное из него. */
export interface Content extends Omit<Locale, "chapters"> {
	/** Главы по порядку (CHAPTER_IDS) — с id и текстом на этом языке. */
	chapters: Chapter[];
	/** Подпись над названием главы `index`: «Зачин», «Глава первая»…, «Концовка». */
	caption: (index: number) => string;
}

/** Подпись главы `index` из шаблона перевода (см. Locale.captions). */
function captionOf(locale: Locale, index: number): string {
	const {beginning, ending, chapter, ordinals} = locale.captions;
	if (index === 0) return beginning;
	if (index === CHAPTER_IDS.length - 1) return ending;
	return chapter.replace("{ordinal}", ordinals[index - 1] ?? String(index));
}

function toContent(locale: Locale): Content {
	return {
		...locale,
		chapters: CHAPTER_IDS.map((id) => ({id, ...locale.chapters[id]})),
		caption: (index) => captionOf(locale, index),
	};
}

/** Тексты на всех языках. */
export const CONTENT = Object.fromEntries(
	Object.entries(LOCALES).map(([lang, locale]) => [lang, toContent(locale)]),
) as Record<Lang, Content>;

/** Тексты на текущем языке (для компонентов — перерисовка при смене языка). */
export function useContent(): Content {
	return CONTENT[useLangStore((s) => s.lang)];
}

/** Тексты на текущем языке (для кода вне React: автопрокрутка, озвучка). */
export function currentContent(): Content {
	return CONTENT[useLangStore.getState().lang];
}
