import ru from "../i18n/locales/ru.json" with {type: "json"};
import type {Chapter} from "../i18n/types";

export type {Chapter} from "../i18n/types";

/**
 * Главы по порядку — id и число глав для сцены, прокрутки и тестов. Тексты на
 * всех языках — в src/i18n/locales/*.json (у всех языков те же id и тот же
 * порядок); здесь — русская версия как основная. Текст пока — черновой
 * пересказ; финальный — сокращённая редакция сказки в записи А. Н. Афанасьева
 * (см. docs/scenario.md).
 */
export const chapters: Chapter[] = ru.chapters;
