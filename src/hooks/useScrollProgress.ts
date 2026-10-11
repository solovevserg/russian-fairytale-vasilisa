import {type RefObject, useEffect} from "react";

import {useStoryStore} from "../state/storyStore";
import {type ReadingAnchors, readingPosition} from "../story/readingPosition";
import {
	anchorOf,
	MOBILE_QUERY,
	scrollPosition,
	viewportSize,
} from "../ui/scrollAxis";

/**
 * Следит за прокруткой и пишет в store положение чтения (readingPosition):
 * хук только измеряет DOM, вычисления — чистая функция.
 * Якорь главы — её середина; фокус — центр видимой области. На десктопе
 * прокручивается окно (вертикально), на мобильных — полоса карточек (горизонтально).
 */
export function useScrollProgress(container: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const root = container.current;
		if (!root) return;
		const {setPosition} = useStoryStore.getState();
		const anchors: ReadingAnchors = {chapters: [], start: 0, credits: 0};
		let frame = 0;

		const measure = () => {
			anchors.chapters = Array.from(
				root.querySelectorAll<HTMLElement>("[data-keyframe]"),
				anchorOf,
			);
			const header = root.querySelector<HTMLElement>(".story__header");
			const footer = root.querySelector<HTMLElement>(".story__credits");
			anchors.start = header ? anchorOf(header) : (anchors.chapters[0] ?? 0);
			anchors.credits = footer
				? anchorOf(footer)
				: (anchors.chapters.at(-1) ?? 0);
		};
		const update = () => {
			frame = 0;
			const focus = scrollPosition() + viewportSize() / 2;
			setPosition(readingPosition(anchors, focus));
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		const remeasure = () => {
			measure();
			schedule();
		};

		remeasure();
		const observer = new ResizeObserver(remeasure);
		observer.observe(root);
		const media = window.matchMedia(MOBILE_QUERY);
		window.addEventListener("scroll", schedule, {passive: true});
		root.addEventListener("scroll", schedule, {passive: true});
		window.addEventListener("resize", remeasure);
		media.addEventListener("change", remeasure);
		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", schedule);
			root.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", remeasure);
			media.removeEventListener("change", remeasure);
			cancelAnimationFrame(frame);
		};
	}, [container]);
}
