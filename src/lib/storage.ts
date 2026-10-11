/**
 * Запоминание настроек читателя в `localStorage`. Хранилище может быть
 * недоступно (приватный режим, запрет cookie) — тогда чтение даёт `null`, а
 * запись молча не происходит: настройка просто не запомнится.
 */

/** Сохранённая строка по ключу `key`; `null` — нет или хранилище недоступно. */
export function readStored(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** Запоминает `value` под ключом `key`, если хранилище доступно. */
export function writeStored(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// не запомнится — не страшно
	}
}
