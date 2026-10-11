import { useEffect, useRef } from "react";
import { useStoryStore } from "../state/storyStore";
import { chapters } from "../story/chapters";

/**
 * Остановки навигации: титул, главы, титры. В адресе — их id (#start, #fire,
 * …, #credits): ссылкой можно поделиться — страница откроется на этом месте.
 */
const STOPS = ["start", ...chapters.map((c) => c.id), "credits"];

/** Плавно прокручивает к остановке (центр экрана — как при CSS scroll-snap). */
function scrollToStop(index: number) {
	const id = STOPS[index];
	if (!id) return;
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	document.getElementById(id)?.scrollIntoView({
		behavior: reduce ? "auto" : "smooth",
		block: "center",
		inline: "center",
	});
}

/** Где читатель сейчас: индекс в STOPS. */
function useStop(): number {
	const activeChapter = useStoryStore((s) => s.activeChapter);
	const edge = useStoryStore((s) => s.edge);
	if (edge === "start") return 0;
	if (edge === "credits") return STOPS.length - 1;
	return activeChapter + 1;
}

/**
 * Якорь в адресе следует за читателем (#start, #fire, #baba-yaga…,
 * #credits). replaceState не засоряет историю и не дёргает прокрутку.
 */
export function useChapterHash() {
	const stop = useStop();
	// место из адреса при открытии ссылки: главы рисует React, поэтому браузер
	// сам к ним не прокрутит — делаем это после монтирования
	const pending = useRef<number | null>(null);
	useEffect(() => {
		const index = STOPS.findIndex((id) => `#${id}` === window.location.hash);
		if (index <= 0) return;
		pending.current = index;
		document
			.getElementById(STOPS[index])
			?.scrollIntoView({ block: "center", inline: "center" });
	}, []);
	useEffect(() => {
		if (pending.current !== null) {
			if (stop !== pending.current) return;
			pending.current = null;
		}
		const id = STOPS[stop];
		if (!id || window.location.hash === `#${id}`) return;
		history.replaceState(null, "", `#${id}`);
	}, [stop]);
}

/** Кнопки «назад / дальше» в области чтения (десктоп): титул, главы, титры. */
export function ChapterNav({
	labels,
}: {
	labels: { nav: string; prev: string; next: string };
}) {
	const stop = useStop();
	return (
		<nav className="chapter-nav" aria-label={labels.nav}>
			<button
				type="button"
				className="chapter-nav__button"
				aria-label={labels.prev}
				title={labels.prev}
				disabled={stop <= 0}
				onClick={() => scrollToStop(stop - 1)}
			>
				<span aria-hidden="true">↑</span>
			</button>
			<button
				type="button"
				className="chapter-nav__button"
				aria-label={labels.next}
				title={labels.next}
				disabled={stop >= STOPS.length - 1}
				onClick={() => scrollToStop(stop + 1)}
			>
				<span aria-hidden="true">↓</span>
			</button>
		</nav>
	);
}
