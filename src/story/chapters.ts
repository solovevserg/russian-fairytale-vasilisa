import {chaptersRu} from "../i18n/chapters/ru";

export type {Chapter} from "../i18n/chapters/types";

/**
 * Главы по порядку — id и число глав для сцены, прокрутки и тестов. Тексты на
 * всех языках — в src/i18n/chapters (у всех языков те же id и тот же порядок);
 * здесь — русская версия как основная.
 */
export const chapters = chaptersRu;
