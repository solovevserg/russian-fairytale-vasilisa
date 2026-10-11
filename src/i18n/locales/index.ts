import type {Locale} from "../types";
import en from "./en.json" with {type: "json"};
import es from "./es.json" with {type: "json"};
import ru from "./ru.json" with {type: "json"};
import zh from "./zh.json" with {type: "json"};

/**
 * Переводы по языкам — единственный список языков: из него выводятся тип
 * Lang и меню языков (LANGS). Порядок ключей — порядок в меню. `satisfies`
 * проверяет при компиляции, что каждый JSON соответствует интерфейсу Locale.
 */
export const LOCALES = {ru, en, es, zh} satisfies Record<string, Locale>;

/** Код языка: ru, en… */
export type Lang = keyof typeof LOCALES;
