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
		let frame = 0;

		const measure = () => {
			anchors = Array.from(
				root.querySelectorAll<HTMLElement>("[data-keyframe]"),
				anchorOf,
			);
		};
		const update = () => {
			frame = 0;
			setProgress(
				progressFromAnchors(anchors, scrollPosition() + viewportSize() / 2),
			);
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
