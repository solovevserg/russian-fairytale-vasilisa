import type { Chapter } from "../story/chapters";

/** Минимальная пауза на чтение главы, с. */
export const MIN_READING_SECONDS = 10;
/** Скорость чтения про себя: ~200 слов в минуту. */
const WORDS_PER_SECOND = 3.3;

/** Сколько секунд дать на чтение главы без озвучки. */
export function readingSeconds(chapter: Chapter): number {
	const words = [chapter.title, ...chapter.paragraphs]
		.join(" ")
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(MIN_READING_SECONDS, Math.ceil(words / WORDS_PER_SECOND));
}

/** Плавный старт и плавная остановка прокрутки. */
export function easeInOutCubic(t: number): number {
	const x = Math.min(Math.max(t, 0), 1);
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Делит абзац на предложения для озвучки: Chrome обрывает длинные фразы
 * (~15 с), а короткие ещё и позволяют быстрее остановиться.
 */
export function splitSentences(text: string): string[] {
	return (
		text
			.match(/[^.!?…]+(?:[.!?…]+[»"”)]*|$)/g)
			?.map((s) => s.trim())
			.filter(Boolean) ?? []
	);
}
