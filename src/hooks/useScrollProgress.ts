import { type RefObject, useEffect } from "react";
import { useStoryStore } from "../state/storyStore";
import { progressFromAnchors } from "../story/timeline";

/**
 * Следит за прокруткой и пишет в store прогресс истории.
 * Якорь главы — её середина; фокус — центр экрана.
 */
export function useScrollProgress(container: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const root = container.current;
		if (!root) return;
		const setProgress = useStoryStore.getState().setProgress;
		let anchors: number[] = [];
		let frame = 0;

		const measure = () => {
			const sections = root.querySelectorAll<HTMLElement>("[data-keyframe]");
			anchors = Array.from(sections, (el) => {
				const rect = el.getBoundingClientRect();
				return rect.top + window.scrollY + rect.height / 2;
			});
		};
		const update = () => {
			frame = 0;
			setProgress(
				progressFromAnchors(anchors, window.scrollY + window.innerHeight / 2),
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
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", remeasure);
		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", remeasure);
			cancelAnimationFrame(frame);
		};
	}, [container]);
}
