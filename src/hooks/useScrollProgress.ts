import { type RefObject, useEffect } from "react";

import { useStoryStore } from "../state/storyStore";
import { progressFromAnchors } from "../story/timeline";
import {
	anchorOf,
	MOBILE_QUERY,
	scrollPosition,
	viewportSize,
} from "../ui/scrollAxis";

/**
 * Следит за прокруткой и пишет в store прогресс истории.
 * Якорь главы — её середина; фокус — центр видимой области. На десктопе
 * прокручивается окно (вертикально), на мобильных — полоса карточек (горизонтально).
 */
export function useScrollProgress(container: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const root = container.current;
		if (!root) return;
		const setProgress = useStoryStore.getState().setProgress;
		let anchors: number[] = [];
		/** Середины титульной и финальной карточек. */
		let start = 0;
		let credits = 0;
		let frame = 0;

		const measure = () => {
			anchors = Array.from(
				root.querySelectorAll<HTMLElement>("[data-keyframe]"),
				anchorOf,
			);
			const header = root.querySelector<HTMLElement>(".story__header");
			const footer = root.querySelector<HTMLElement>(".story__credits");
			start = header ? anchorOf(header) : (anchors[0] ?? 0);
			credits = footer ? anchorOf(footer) : (anchors.at(-1) ?? 0);
		};
		const update = () => {
			frame = 0;
			const focus = scrollPosition() + viewportSize() / 2;
			const first = anchors[0] ?? 0;
			const last = anchors.at(-1) ?? 0;
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
			setProgress(progressFromAnchors(anchors, focus), title, edge, toCredits);
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
		window.addEventListener("scroll", schedule, { passive: true });
		root.addEventListener("scroll", schedule, { passive: true });
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
