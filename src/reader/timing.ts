import type {ChapterText} from "../i18n/types";

/** Минимальная пауза на чтение главы, с. */
export const MIN_READING_SECONDS = 10;
/** Скорость чтения про себя: ~200 слов в минуту. */
const WORDS_PER_SECOND = 3.3;

/** Иероглифов на одно «слово» по скорости чтения (~300 знаков в минуту). */
const HANZI_PER_WORD = 1.5;
const HANZI = /\p{Script=Han}/gu;

/** Сколько секунд дать на чтение главы без озвучки. */
export function readingSeconds(chapter: ChapterText): number {
	const text = [chapter.title, ...chapter.paragraphs].join(" ");
	// в китайском нет пробелов — считаем иероглифы
	const hanzi = text.match(HANZI)?.length ?? 0;
	const spaced = text
		.replace(HANZI, " ")
		.split(/\s+/)
		.filter((w) => /\p{L}/u.test(w)).length;
	const words = spaced + hanzi / HANZI_PER_WORD;
	return Math.max(MIN_READING_SECONDS, Math.ceil(words / WORDS_PER_SECOND));
}

/**
 * Делит абзац на предложения для озвучки: Chrome обрывает длинные фразы
 * (~15 с), а короткие ещё и позволяют быстрее остановиться.
 */
export function splitSentences(text: string): string[] {
	return (
		text
			.match(/[^.!?…。！？]+(?:[.!?…。！？]+[»"”)」]*|$)/g)
			?.map((s) => s.trim())
			.filter(Boolean) ?? []
	);
}
