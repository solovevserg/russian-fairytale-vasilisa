/**
 * Помощники для страницы: медиазапросы и прокрутка. Вне браузера (тесты,
 * сборка) медиазапросы не совпадают.
 */

/** Медиазапрос «уменьшить движение» (настройка системы). */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Совпадает ли медиазапрос `query` сейчас; вне браузера — нет. */
export function matchesMedia(query: string): boolean {
	return typeof window !== "undefined" && window.matchMedia(query).matches;
}

/** Читатель просил систему уменьшить движение на экране. */
export function prefersReducedMotion(): boolean {
	return matchesMedia(REDUCED_MOTION_QUERY);
}

/**
 * Прокручивает к элементу с `id`, ставя его в центр экрана по обеим осям (как
 * при CSS scroll-snap): плавно, а при «уменьшить движение» — сразу.
 */
export function scrollToCenter(id: string): void {
	document.getElementById(id)?.scrollIntoView({
		behavior: prefersReducedMotion() ? "auto" : "smooth",
		block: "center",
		inline: "center",
	});
}
