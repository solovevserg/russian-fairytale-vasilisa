/**
 * Параметры адреса страницы (`?instant&time=9`) — один разбор на загрузку.
 * Вне браузера (тесты, сборка) параметров нет.
 */

const params =
	typeof window === "undefined"
		? new URLSearchParams()
		: new URLSearchParams(window.location.search);

/** Есть ли в адресе параметр `name` (с любым значением или без). */
export function urlFlag(name: string): boolean {
	return params.has(name);
}

/** Строковое значение параметра `name`; `null` — нет такого. */
export function urlString(name: string): string | null {
	return params.get(name);
}

/** Числовое значение параметра `name`; `null` — нет или не число. */
export function urlNumber(name: string): number | null {
	const value = Number.parseFloat(params.get(name) ?? "");
	return Number.isFinite(value) ? value : null;
}
