import { useEffect, useState } from "react";
import { useContent } from "../i18n/content";
import { scrollToCenter } from "../lib/dom";
import { autoReader } from "../reader/autoReader";
import { useReaderStore } from "../reader/readerStore";
import { useStoryStore } from "../state/storyStore";

/** Через сколько секунд на финальной карточке появляется кнопка, мс. */
const DELAY_MS = 6000;

/**
 * Мобильные: на финальной карточке (автор и посвящение) через несколько
 * секунд поверх избушки появляется «Вернуться в начало» — в том же виде,
 * что и подсказка «листайте» на первом экране. На компьютере скрыта стилями.
 */
export function BackToStart() {
	const label = useContent().ui.backToStart;
	const onCredits = useStoryStore((s) => s.edge === "credits");
	const [shown, setShown] = useState(false);

	useEffect(() => {
		if (!onCredits) {
			setShown(false);
			return;
		}
		const timer = window.setTimeout(() => setShown(true), DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [onCredits]);

	const back = () => {
		if (useReaderStore.getState().playing) autoReader.stop();
		scrollToCenter("start");
	};

	return (
		<button
			type="button"
			className={shown ? "back-to-start back-to-start--shown" : "back-to-start"}
			tabIndex={shown ? 0 : -1}
			aria-hidden={!shown}
			onClick={back}
		>
			<span className="back-to-start__arrow" aria-hidden="true">
				←
			</span>
			<span className="back-to-start__label">{label}</span>
		</button>
	);
}
