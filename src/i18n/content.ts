import {
	type Chapter,
	chapters,
	STORY_SUBTITLE,
	STORY_TITLE,
} from "../story/chapters";
import { chaptersEn } from "../story/chaptersEn";
import { type Lang, useLangStore } from "./lang";

const ORDINALS_RU = [
	"первая",
	"вторая",
	"третья",
	"четвёртая",
	"пятая",
	"шестая",
	"седьмая",
	"восьмая",
	"девятая",
	"десятая",
];
const ORDINALS_EN = [
	"One",
	"Two",
	"Three",
	"Four",
	"Five",
	"Six",
	"Seven",
	"Eight",
	"Nine",
	"Ten",
];

/** Тексты сказки и интерфейса на одном языке. */
export interface Content {
	title: string;
	subtitle: string;
	source: string;
	chapters: Chapter[];
	/** Подпись над названием главы: «Зачин», «Глава первая»…, «Концовка». */
	caption: (index: number) => string;
	/** Язык синтеза речи для озвучки. */
	speechLang: string;
	documentTitle: string;
	ui: {
		read: string;
		pause: string;
		narrate: string;
		narrateOn: string;
		narrateTitle: string;
		soundOn: string;
		soundOff: string;
		soundEnable: string;
		soundDisable: string;
		themeLight: string;
		themeDark: string;
		langSwitch: string;
		langSwitchTitle: string;
		toolbar: string;
		chaptersNav: string;
		prevChapter: string;
		nextChapter: string;
		credits: {
			music: string;
			models: string;
			author: [before: string, name: string, middle: string];
			allSources: string;
			sourceCode: string;
		};
	};
}

const last = chapters.length - 1;

export const CONTENT: Record<Lang, Content> = {
	ru: {
		title: STORY_TITLE,
		subtitle: STORY_SUBTITLE,
		source: "по мотивам собрания А. Н. Афанасьева",
		chapters,
		caption: (i) =>
			i === 0
				? "Зачин"
				: i === last
					? "Концовка"
					: `Глава ${ORDINALS_RU[i - 1] ?? i}`,
		speechLang: "ru-RU",
		documentTitle: "Избушка на курьих ножках",
		ui: {
			read: "Читать сказку",
			pause: "Пауза",
			narrate: "Озвучка",
			narrateOn: "Озвучка вкл.",
			narrateTitle: "Читать вслух голосом браузера",
			soundOn: "Звук включён",
			soundOff: "Включить звук",
			soundEnable: "Включить звук",
			soundDisable: "Выключить звук",
			themeLight: "Светлая тема",
			themeDark: "Тёмная тема",
			langSwitch: "🇬🇧",
			langSwitchTitle: "Read in English",
			toolbar: "Управление чтением",
			chaptersNav: "Главы",
			prevChapter: "Предыдущая глава",
			nextChapter: "Следующая глава",
			credits: {
				music:
					"Музыка — М. П. Мусоргский, «Картинки с выставки» (записи Musopen, общественное достояние). Звуки леса — OpenGameArt и BigSoundBank (CC0). Текстуры земли — Poly Haven (CC0). Деревья — ez-tree (MIT). Шрифты — Ruslan Display и Old Standard TT (OFL).",
				models:
					"3D-модели (CC BY 4.0, изменены: упрощены, сжаты, Василиса раскрашена):",
				author: ["Сайт создан ", "Сергеем Соловьёвым", " вместе с "],
				allSources: "Все источники и лицензии",
				sourceCode: "Исходный код",
			},
		},
	},
	en: {
		title: "Vasilisa the Beautiful",
		subtitle: "A Russian folk tale",
		source: "after the collection of Alexander Afanasyev",
		chapters: chaptersEn,
		caption: (i) =>
			i === 0
				? "Beginning"
				: i === last
					? "Ending"
					: `Chapter ${ORDINALS_EN[i - 1] ?? i}`,
		speechLang: "en-GB",
		documentTitle: "The Hut on Chicken Legs",
		ui: {
			read: "Read the tale",
			pause: "Pause",
			narrate: "Narration",
			narrateOn: "Narration on",
			narrateTitle: "Read aloud with the browser’s voice",
			soundOn: "Sound on",
			soundOff: "Turn sound on",
			soundEnable: "Turn sound on",
			soundDisable: "Turn sound off",
			themeLight: "Light theme",
			themeDark: "Dark theme",
			langSwitch: "🇷🇺",
			langSwitchTitle: "Читать по-русски",
			toolbar: "Reading controls",
			chaptersNav: "Chapters",
			prevChapter: "Previous chapter",
			nextChapter: "Next chapter",
			credits: {
				music:
					"Music — Modest Mussorgsky, “Pictures at an Exhibition” (Musopen recordings, public domain). Forest sounds — OpenGameArt and BigSoundBank (CC0). Ground textures — Poly Haven (CC0). Trees — ez-tree (MIT). Fonts — Ruslan Display and Old Standard TT (OFL).",
				models:
					"3D models (CC BY 4.0, modified: simplified, compressed, Vasilisa painted):",
				author: ["Made by ", "Sergei Solovev", " together with "],
				allSources: "All sources and licenses",
				sourceCode: "Source code",
			},
		},
	},
};

/** Тексты на текущем языке (для компонентов — перерисовка при смене языка). */
export function useContent(): Content {
	return CONTENT[useLangStore((s) => s.lang)];
}

/** Тексты на текущем языке (для кода вне React: автопрокрутка, озвучка). */
export function currentContent(): Content {
	return CONTENT[useLangStore.getState().lang];
}
