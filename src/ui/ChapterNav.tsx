import { useEffect, useRef } from "react";
import { useStoryStore } from "../state/storyStore";
import { chapters } from "../story/chapters";

/** Плавно прокручивает к главе (центр экрана — как при CSS scroll-snap). */
export function scrollToChapter(index: number) {
	const chapter = chapters[index];
	if (!chapter) return;
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	document.getElementById(chapter.id)?.scrollIntoView({
		behavior: reduce ? "auto" : "smooth",
		block: "center",
		inline: "center",
	});
}

/**
 * Якорь в адресе следует за активной главой (#fire, #baba-yaga…): ссылкой
 * можно поделиться — страница откроется на этой главе. replaceState не
 * засоряет историю и не дёргает прокрутку.
 */
export function useChapterHash() {
	const activeChapter = useStoryStore((s) => s.activeChapter);
	// глава из адреса при открытии ссылки: главы рисует React, поэтому браузер
	// сам к ним не прокрутит — делаем это после монтирования
	const pending = useRef<number | null>(null);
	useEffect(() => {
		const index = chapters.findIndex(
			(c) => `#${c.id}` === window.location.hash,
		);
		if (index <= 0) return;
		pending.current = index;
		document
			.getElementById(chapters[index].id)
			?.scrollIntoView({ block: "center", inline: "center" });
	}, []);
	useEffect(() => {
		if (pending.current !== null) {
			if (activeChapter !== pending.current) return;
			pending.current = null;
		}
		const id = chapters[activeChapter]?.id;
		if (!id || window.location.hash === `#${id}`) return;
		history.replaceState(null, "", `#${id}`);
	}, [activeChapter]);
}

/** Кнопки «предыдущая / следующая глава» в области чтения (десктоп). */
export function ChapterNav({
	labels,
}: {
	labels: { prev: string; next: string };
}) {
	const activeChapter = useStoryStore((s) => s.activeChapter);
	const last = chapters.length - 1;
	return (
		<nav className="chapter-nav" aria-label="Главы">
			<button
				type="button"
				className="chapter-nav__button"
				aria-label={labels.prev}
				title={labels.prev}
				disabled={activeChapter <= 0}
				onClick={() => scrollToChapter(activeChapter - 1)}
			>
				<span aria-hidden="true">↑</span>
			</button>
			<button
				type="button"
				className="chapter-nav__button"
				aria-label={labels.next}
				title={labels.next}
				disabled={activeChapter >= last}
				onClick={() => scrollToChapter(activeChapter + 1)}
			>
				<span aria-hidden="true">↓</span>
			</button>
		</nav>
	);
}
