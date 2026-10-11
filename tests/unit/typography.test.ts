import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import {join} from "node:path";

import {
	INDEX_HTML,
	NBSP,
	type TypographyLang,
	typograph,
	typographHtml,
	typographJson,
} from "../../scripts/typography";
import {LOCALES} from "../../src/i18n/locales/index";

const ROOT = join(import.meta.dir, "../..");
/** Пробелы в примерах ниже — обычные; `_` — ожидаемый неразрывный. */
const nb = (text: string) => text.replaceAll("_", NBSP);

describe("неразрывные пробелы", () => {
	test("после коротких слов и предлогов, в том числе цепочкой", () => {
		expect(typograph("и в лес пошла для неё", "ru")).toBe(
			nb("и_в_лес пошла для_неё"),
		);
		expect(typograph("Vasilisa the Beautiful in a forest", "en")).toBe(
			nb("Vasilisa the_Beautiful in_a_forest"),
		);
		expect(typograph("con una muñequita", "es")).toBe(nb("con_una_muñequita"));
	});

	test("короткое слово в конце строки — перед ссылкой — тоже привязано", () => {
		expect(typograph("создано вместе с ", "ru")).toBe(nb("создано вместе с_"));
	});

	test("перед тире, частицами; инициалы, сокращения, числа", () => {
		expect(typograph("дочь — Василиса", "ru")).toBe(nb("дочь_— Василиса"));
		expect(typograph("пошла ли она бы", "ru")).toBe(nb("пошла_ли она_бы"));
		expect(typograph("собрание А. Н. Афанасьева", "ru")).toBe(
			nb("собрание А._Н._Афанасьева"),
		);
		expect(typograph("т. е. три дня", "ru")).toBe(nb("т._е. три дня"));
		expect(typograph("через 3 дня", "ru")).toBe(nb("через 3_дня"));
	});

	test("не трогает части слов, дефисы и китайский", () => {
		expect(typograph("жил-был купец", "ru")).toBe("жил-был купец");
		expect(typograph("кое-как добрались", "ru")).toBe("кое-как добрались");
		expect(typograph("从前 在 某个", "zh")).toBe("从前 在 某个");
	});

	test("одним символом U+00A0, без последовательностей", () => {
		const result = typograph("и в лес", "ru");
		expect(result).toContain("\u00A0");
		expect(result).not.toMatch(/&nbsp;|\\u00a0|&#160;/i);
	});

	test("повторный вызов ничего не меняет", () => {
		const once = typograph("и в лес — по тропе А. Н. к 3 дубам", "ru");
		expect(typograph(once, "ru")).toBe(once);
	});
});

describe("тексты сайта уже обработаны (иначе — bun run typograph)", () => {
	for (const [lang, locale] of Object.entries(LOCALES)) {
		test(`перевод ${lang}`, () => {
			expect(typographJson(locale, lang as TypographyLang)).toEqual(locale);
		});
	}

	test("index.html", () => {
		const html = readFileSync(join(ROOT, INDEX_HTML), "utf8");
		expect(typographHtml(html)).toBe(html);
	});
});
