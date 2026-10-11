import { useEffect, useState } from "react";

import { useContent } from "../i18n/content";
import { useReaderStore } from "../reader/readerStore";

/**
 * Мобильные: на первом экране (карточка с названием) поверх сцены — стрелка
 * «листайте» и подсказка про «Читать». Исчезает, как только начали листать.
 * На компьютере скрыта стилями.
 */
export function SwipeHint() {
	const [action, alternative] = useContent().ui.swipeHint;
	const playing = useReaderStore((s) => s.playing);
	const [atStart, setAtStart] = useState(true);

	useEffect(() => {
		const story = document.querySelector<HTMLElement>(".story");
		if (!story) return;
		// первая карточка — пока не пролистали и треть её ширины
		const update = () => setAtStart(story.scrollLeft < story.clientWidth / 3);
		update();
		story.addEventListener("scroll", update, { passive: true });
		return () => story.removeEventListener("scroll", update);
	}, []);

	const shown = atStart && !playing;
	return (
		<div
			className={shown ? "swipe-hint swipe-hint--shown" : "swipe-hint"}
			aria-hidden={!shown}
		>
			<span className="swipe-hint__arrow" aria-hidden="true">
				→
			</span>
			<p className="swipe-hint__action">{action}</p>
			<p className="swipe-hint__alternative">{alternative}</p>
		</div>
	);
}
