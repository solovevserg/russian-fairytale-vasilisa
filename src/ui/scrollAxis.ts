/**
 * Ось чтения: на десктопе главы идут вертикально и прокручивается окно, на
 * мобильных — горизонтальная полоса карточек внизу экрана (.story), чтобы
 * текст не закрывал сцену. Все места, которые читают или двигают прокрутку
 * (прогресс истории, автопрокрутка), работают через эти функции.
 */
export const MOBILE_QUERY = "(max-width: 1023px)";

export function isHorizontal(): boolean {
	return window.matchMedia(MOBILE_QUERY).matches;
}

export function storyElement(): HTMLElement | null {
	return document.querySelector<HTMLElement>(".story");
}

/** Текущая позиция прокрутки по оси чтения. */
export function scrollPosition(): number {
	return isHorizontal() ? (storyElement()?.scrollLeft ?? 0) : window.scrollY;
}

/** Размер видимой области по оси чтения. */
export function viewportSize(): number {
	return isHorizontal()
		? (storyElement()?.clientWidth ?? window.innerWidth)
		: window.innerHeight;
}

export function setScrollPosition(value: number) {
	if (isHorizontal()) {
		const story = storyElement();
		if (story) story.scrollLeft = value;
	} else {
		window.scrollTo(0, value);
	}
}

/** Середина главы по оси чтения (в координатах прокрутки). */
export function anchorOf(element: HTMLElement): number {
	if (isHorizontal()) return element.offsetLeft + element.offsetWidth / 2;
	const rect = element.getBoundingClientRect();
	return rect.top + window.scrollY + rect.height / 2;
}

/** Позиция прокрутки, при которой глава — по центру. */
export function scrollPositionFor(element: HTMLElement): number {
	return anchorOf(element) - viewportSize() / 2;
}
