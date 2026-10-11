import ru from "../i18n/locales/ru.json" with {type: "json"};
import type {Chapter} from "../i18n/types";

export type {Chapter} from "../i18n/types";

/**
 * id глав по порядку — единственный источник порядка и набора глав: по id
 * выбирается кадр сцены (keyframes.ts), якорь в адресе и текст в каждом
 * переводе (src/i18n/locales/*.json, `chapters.<id>`).
 */
export const CHAPTER_IDS = [
	"prologue",
	"fire",
	"white-rider",
	"red-rider",
	"sunrise",
	"clearing",
	"black-rider",
	"baba-yaga",
	"tasks",
	"skull",
	"epilogue",
] as const;

/** id главы. */
export type ChapterId = (typeof CHAPTER_IDS)[number];

/**
 * Главы по порядку с русским текстом — для сцены, прокрутки и тестов (им
 * нужны id и число глав). Текст пока — черновой пересказ; финальный —
 * сокращённая редакция сказки в записи А. Н. Афанасьева (см. docs/scenario.md).
 */
export const chapters: Chapter[] = CHAPTER_IDS.map((id) => ({
	id,
	...ru.chapters[id],
}));
