/**
 * Неразрывные пробелы по правилам типографики — одним символом U+00A0.
 *
 *   bun run typograph — расставить во всех текстах (переводы и index.html)
 *
 * Правила — чистая функция typograph; юнит-тест (tests/unit/typography.test.ts)
 * проверяет, что все тексты уже обработаны: новый текст без неразрывных
 * пробелов уронит тест — достаточно снова запустить скрипт.
 */
import {readdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

/** Неразрывный пробел. */
export const NBSP = "\u00A0";

export type TypographyLang = "ru" | "en" | "es" | "zh";

/**
 * Служебные слова, которые не оставляют в конце строки (неразрывный пробел
 * после них) — сверх всех слов из одной-двух букв.
 */
const SHORT_WORDS: Record<Exclude<TypographyLang, "zh">, string[]> = {
	ru: ["без", "для", "над", "под", "при", "про", "обо", "изо", "ото"],
	en: ["the"],
	es: ["los", "las", "del", "con", "por", "sin", "una", "que"],
};

/** Частицы, которые не переносят в начало строки (неразрывный пробел перед ними). */
const PARTICLES: Partial<Record<TypographyLang, string[]>> = {
	ru: ["ли", "ль", "же", "ж", "бы", "б"],
};

/** Что может стоять перед словом: начало, пробел, открывающие кавычки и скобки, тире. */
const BEFORE_WORD = String.raw`(?<=^|[\s«„“"'(\[—])`;

/**
 * Расставляет неразрывные пробелы в тексте на языке `lang`:
 * - после слов из одной-двух букв и коротких служебных слов («в лес»,
 *   «для неё», «the forest»), в том числе перед ссылкой в конце строки;
 * - перед частицами «ли», «же», «бы»;
 * - перед тире, окружённым пробелами («Василиса — красавица»);
 * - в инициалах и перед фамилией («А. Н. Афанасьев»), в сокращениях «т. е.»;
 * - между числом и словом («3 дня»).
 *
 * Идемпотентна: повторный вызов ничего не меняет. Китайский текст не трогает
 * (в нём нет пробелов между словами).
 */
export function typograph(text: string, lang: TypographyLang): string {
	if (lang === "zh") return text;
	let result = text
		// инициалы: «А. Н. Афанасьев», «A. N. Afanasyev»
		.replace(/(?<=(?:^|[\s«„“"(])\p{Lu}\.)\s+(?=\p{Lu})/gu, NBSP)
		// сокращения из строчной буквы с точкой: «т. е.», «и т. д.»
		.replace(/(?<=(?:^|\s)\p{Ll}\.)\s+(?=\p{Ll}\.)/gu, NBSP)
		// число и слово: «3 дня»
		.replace(/(?<=\d)[ \u00A0]+(?=\p{L})/gu, NBSP)
		// тире не начинает строку
		.replace(/[ \u00A0]+(?=—(?:\s|$))/g, NBSP);

	const particles = PARTICLES[lang];
	if (particles) {
		const pattern = new RegExp(
			String.raw`[ \u00A0]+(?=(?:${particles.join("|")})(?![\p{L}\d-]))`,
			"gu",
		);
		result = result.replace(pattern, NBSP);
	}

	const words = [String.raw`\p{L}{1,2}`, ...SHORT_WORDS[lang]].join("|");
	// частицы относятся к предыдущему слову, а не к следующему
	const notParticle = particles
		? `(?!(?:${particles.join("|")})[ \u00A0])`
		: "";
	const shortWord = new RegExp(
		String.raw`${BEFORE_WORD}${notParticle}(${words})[ \u00A0]+(?=\S|$)`,
		"giu",
	);
	return result.replace(shortWord, `$1${NBSP}`);
}

type Json = string | number | boolean | null | Json[] | {[key: string]: Json};

/** Применяет typograph ко всем строкам JSON (ключи не трогает). */
export function typographJson(value: Json, lang: TypographyLang): Json {
	if (typeof value === "string") return typograph(value, lang);
	if (Array.isArray(value)) return value.map((v) => typographJson(v, lang));
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, v]) => [key, typographJson(v, lang)]),
		);
	}
	return value;
}

/**
 * Видимые тексты index.html (русский): заголовок вкладки, описания для
 * поисковиков и превью ссылок (`content` у meta), текст для браузеров без JS.
 * Структурированные данные (JSON-LD) не трогает.
 */
export function typographHtml(html: string): string {
	return html
		.replace(
			/(<(title|h1|p)>)([^<]*)(<\/\2>)/g,
			(_, open, _tag, text, close) => open + typograph(text, "ru") + close,
		)
		.replace(
			/(<meta\s[^>]*content=")([^"]*\p{Script=Cyrillic}[^"]*)(")/gu,
			(_, open, text, close) => open + typograph(text, "ru") + close,
		);
}

export const LOCALES_DIR = "src/i18n/locales";
export const INDEX_HTML = "index.html";

if (import.meta.main) {
	for (const file of readdirSync(LOCALES_DIR).filter((f) =>
		f.endsWith(".json"),
	)) {
		const path = join(LOCALES_DIR, file);
		const lang = file.replace(".json", "") as TypographyLang;
		const json = JSON.parse(readFileSync(path, "utf8")) as Json;
		writeFileSync(
			path,
			`${JSON.stringify(typographJson(json, lang), null, "\t")}\n`,
		);
		console.log(`✓ ${path}`);
	}
	writeFileSync(INDEX_HTML, typographHtml(readFileSync(INDEX_HTML, "utf8")));
	console.log(`✓ ${INDEX_HTML}`);
}
