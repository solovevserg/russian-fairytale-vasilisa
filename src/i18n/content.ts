import {chaptersEn} from "./chapters/en";
import {chaptersEs} from "./chapters/es";
import {
	chaptersRu as chapters,
	STORY_SUBTITLE,
	STORY_TITLE,
} from "./chapters/ru";
import type {Chapter} from "./chapters/types";
import {chaptersZh} from "./chapters/zh";
import {type Lang, useLangStore} from "./lang";

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
const ORDINALS_ES = [
	"primero",
	"segundo",
	"tercero",
	"cuarto",
	"quinto",
	"sexto",
	"séptimo",
	"octavo",
	"noveno",
	"décimo",
];
const ORDINALS_ZH = [
	"一",
	"二",
	"三",
	"四",
	"五",
	"六",
	"七",
	"八",
	"九",
	"十",
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
	/** meta description для поисковиков и превью ссылок. */
	description: string;
	ui: {
		read: string;
		/** Короткая подпись для мобильных. */
		readShort: string;
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
		/** Подсказка на первом экране мобильной версии: как листать и что «Читать» — само. */
		swipeHint: [action: string, alternative: string];
		/** Кнопка на финальной карточке (телефон): вернуться к началу сказки. */
		backToStart: string;
		/** Подпись меню языков. */
		language: string;
		toolbar: string;
		chaptersNav: string;
		prevChapter: string;
		nextChapter: string;
		credits: {
			music: string;
			models: string;
			/** Надзаголовок титров и имя автора — заголовок. */
			authorRole: string;
			authorName: string;
			/** Посвящение — под именем автора. */
			dedication: string;
			/** Текст вокруг ссылки на Claude: «создано вместе с » + Claude + «». */
			withClaude: [before: string, after: string];
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
		documentTitle: "Василиса Прекрасная — интерактивная 3D-сказка",
		description:
			"Русская народная сказка «Василиса Прекрасная» в 3D: листайте главы — и по ночному лесу проносятся всадники, светятся черепа на заборе, к избушке на курьих ножках прилетает Баба Яга. С озвучкой и музыкой Мусоргского.",
		ui: {
			read: "Читать сказку",
			readShort: "Читать",
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
			swipeHint: [
				"Листайте, чтобы смотреть сказку",
				"или нажмите «Читать» — она пойдёт сама",
			],
			language: "Язык",
			backToStart: "Вернуться в начало",
			toolbar: "Управление чтением",
			chaptersNav: "Главы",
			prevChapter: "Предыдущая глава",
			nextChapter: "Следующая глава",
			credits: {
				music:
					"Музыка — М. П. Мусоргский, «Картинки с выставки» (записи Musopen, общественное достояние). Звуки леса — OpenGameArt и BigSoundBank (CC0). Текстуры земли — Poly Haven (CC0). Деревья — ez-tree (MIT). Черепа — Quaternius (CC0). Шрифты — Ruslan Display и Old Standard TT (OFL).",
				models:
					"3D-модели (изменены: упрощены, сжаты, Василиса раскрашена, изба перекрашена):",
				authorRole: "Автор проекта",
				authorName: "Сергей Соловьёв",
				dedication: "Посвящается моей жене Стефании",
				withClaude: ["создано вместе с ", ""],
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
		documentTitle: "Vasilisa the Beautiful — an interactive 3D fairy tale",
		description:
			"The Russian folk tale “Vasilisa the Beautiful” in 3D: scroll through the chapters as riders gallop through the night forest, skulls glow on the fence and Baba Yaga flies to her hut on chicken legs. With narration and music by Mussorgsky.",
		ui: {
			read: "Read the tale",
			readShort: "Read",
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
			swipeHint: ["Swipe to watch the tale", "or tap “Read” to play it"],
			backToStart: "Back to the beginning",
			language: "Language",
			toolbar: "Reading controls",
			chaptersNav: "Chapters",
			prevChapter: "Previous chapter",
			nextChapter: "Next chapter",
			credits: {
				music:
					"Music — Modest Mussorgsky, “Pictures at an Exhibition” (Musopen recordings, public domain). Forest sounds — OpenGameArt and BigSoundBank (CC0). Ground textures — Poly Haven (CC0). Trees — ez-tree (MIT). Skulls — Quaternius (CC0). Fonts — Ruslan Display and Old Standard TT (OFL).",
				models:
					"3D models (modified: simplified, compressed, Vasilisa painted, cabin recoloured):",
				authorRole: "Project author",
				authorName: "Sergei Solovev",
				dedication: "Dedicated to my wife Stefania",
				withClaude: ["made together with ", ""],
				allSources: "All sources and licenses",
				sourceCode: "Source code",
			},
		},
	},
	es: {
		title: "Vasilisa la Hermosa",
		subtitle: "Cuento popular ruso",
		source: "según la colección de Alexandr Afanásiev",
		chapters: chaptersEs,
		caption: (i) =>
			i === 0
				? "Comienzo"
				: i === last
					? "Final"
					: `Capítulo ${ORDINALS_ES[i - 1] ?? i}`,
		speechLang: "es-ES",
		documentTitle: "Vasilisa la Hermosa — un cuento interactivo en 3D",
		description:
			"El cuento popular ruso «Vasilisa la Hermosa» en 3D: pasa los capítulos y verás jinetes cruzar el bosque nocturno, calaveras brillar en la cerca y a Baba Yagá volar hasta su isbá sobre patas de gallina. Con narración y música de Músorgski.",
		ui: {
			read: "Leer el cuento",
			readShort: "Leer",
			pause: "Pausa",
			narrate: "Narración",
			narrateOn: "Narración activada",
			narrateTitle: "Leer en voz alta con la voz del navegador",
			soundOn: "Sonido activado",
			soundOff: "Activar sonido",
			soundEnable: "Activar sonido",
			soundDisable: "Desactivar sonido",
			themeLight: "Tema claro",
			themeDark: "Tema oscuro",
			swipeHint: [
				"Desliza para ver el cuento",
				"o pulsa «Leer» y avanzará solo",
			],
			language: "Idioma",
			backToStart: "Volver al principio",
			toolbar: "Controles de lectura",
			chaptersNav: "Capítulos",
			prevChapter: "Capítulo anterior",
			nextChapter: "Capítulo siguiente",
			credits: {
				music:
					"Música: Modest Músorgski, «Cuadros de una exposición» (grabaciones de Musopen, dominio público). Sonidos del bosque: OpenGameArt y BigSoundBank (CC0). Texturas del suelo: Poly Haven (CC0). Árboles: ez-tree (MIT). Calaveras: Quaternius (CC0). Tipografías: Ruslan Display y Old Standard TT (OFL).",
				models:
					"Modelos 3D (modificados: simplificados, comprimidos, Vasilisa pintada, cabaña recoloreada):",
				authorRole: "Autor del proyecto",
				authorName: "Serguéi Solovióv",
				dedication: "Dedicado a mi esposa Stefania",
				withClaude: ["hecho junto con ", ""],
				allSources: "Todas las fuentes y licencias",
				sourceCode: "Código fuente",
			},
		},
	},
	zh: {
		title: "美丽的瓦西丽莎",
		subtitle: "俄罗斯民间故事",
		source: "据阿法纳西耶夫《俄罗斯民间故事集》改编",
		chapters: chaptersZh,
		caption: (i) =>
			i === 0 ? "开篇" : i === last ? "结尾" : `第${ORDINALS_ZH[i - 1] ?? i}章`,
		speechLang: "zh-CN",
		documentTitle: "美丽的瓦西丽莎 — 交互式3D童话",
		description:
			"俄罗斯民间故事《美丽的瓦西丽莎》3D版：翻阅章节，看骑士穿过夜晚的森林，篱笆上的骷髅亮起眼睛，芭芭雅嘎飞向她的鸡腿小木屋。配有朗读和穆索尔斯基的音乐。",
		ui: {
			read: "阅读故事",
			readShort: "阅读",
			pause: "暂停",
			narrate: "朗读",
			narrateOn: "朗读已开启",
			narrateTitle: "用浏览器语音朗读",
			soundOn: "声音已开启",
			soundOff: "开启声音",
			soundEnable: "开启声音",
			soundDisable: "关闭声音",
			themeLight: "浅色主题",
			themeDark: "深色主题",
			swipeHint: ["滑动观看故事", "或点击“阅读”自动播放"],
			backToStart: "回到开头",
			language: "语言",
			toolbar: "阅读控制",
			chaptersNav: "章节",
			prevChapter: "上一章",
			nextChapter: "下一章",
			credits: {
				music:
					"音乐：穆索尔斯基《图画展览会》（Musopen 录音，公有领域）。森林音效：OpenGameArt 与 BigSoundBank（CC0）。地面纹理：Poly Haven（CC0）。树木：ez-tree（MIT）。骷髅：Quaternius（CC0）。字体：Ruslan Display 与 Old Standard TT（OFL）。",
				models: "3D 模型（已修改：简化、压缩，瓦西丽莎上色，木屋重新配色）：",
				authorRole: "项目作者",
				authorName: "谢尔盖·索洛维约夫",
				dedication: "献给我的妻子斯特凡尼娅",
				withClaude: ["与 ", " 共同创建"],
				allSources: "全部来源与许可",
				sourceCode: "源代码",
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
