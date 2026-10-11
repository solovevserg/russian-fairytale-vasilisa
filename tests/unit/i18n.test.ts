import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import {join} from "node:path";

import {CONTENT} from "../../src/i18n/content";
import {LANGS, pickLang} from "../../src/i18n/lang";
import LOCALE_RU from "../../src/i18n/locales/ru.json" with {type: "json"};

describe("переводы", () => {
	const ru = CONTENT.ru;
	const en = CONTENT.en;

	const others = LANGS.filter((l) => l.id !== "ru").map((l) => CONTENT[l.id]);

	test("главы на всех языках совпадают по id и числу абзацев", () => {
		for (const other of others) {
			expect(other.chapters.map((c) => c.id)).toEqual(
				ru.chapters.map((c) => c.id),
			);
			other.chapters.forEach((c, i) => {
				expect(c.paragraphs.length).toBe(ru.chapters[i].paragraphs.length);
				expect(c.title.length).toBeGreaterThan(0);
			});
		}
	});

	test("подписи глав: зачин, главы по порядку, концовка", () => {
		const last = ru.chapters.length - 1;
		expect(ru.caption(0)).toBe("Зачин");
		expect(ru.caption(1)).toBe("Глава первая");
		expect(ru.caption(last)).toBe("Концовка");
		expect(en.caption(0)).toBe("Beginning");
		expect(en.caption(2)).toBe("Chapter Two");
		expect(en.caption(last)).toBe("Ending");
		expect(CONTENT.es.caption(1)).toBe("Capítulo primero");
		expect(CONTENT.zh.caption(3)).toBe("第三章");
	});

	/** Пути ко всем строкам файла перевода (кроме глав — их проверяет тест выше). */
	function keyPaths(value: unknown, path = ""): string[] {
		if (Array.isArray(value)) return [`${path}[${value.length}]`];
		if (value && typeof value === "object")
			return Object.entries(value)
				.filter(([key]) => !(path === "" && key === "chapters"))
				.flatMap(([key, v]) => keyPaths(v, path ? `${path}.${key}` : key));
		return [path];
	}

	test("файлы переводов: одинаковый набор ключей, без лишних и пропущенных", () => {
		for (const l of LANGS) {
			const file = JSON.parse(
				readFileSync(
					join(import.meta.dir, `../../src/i18n/locales/${l.id}.json`),
					"utf8",
				),
			);
			expect(keyPaths(file).sort()).toEqual(keyPaths(LOCALE_RU).sort());
		}
	});

	test("числительных хватает на все главы, пары строк — пары", () => {
		for (const l of LANGS) {
			const c = CONTENT[l.id];
			expect(c.captions.ordinals.length).toBeGreaterThanOrEqual(
				c.chapters.length - 2,
			);
			expect(c.captions.chapter).toContain("{ordinal}");
			expect(c.ui.swipeHint).toHaveLength(2);
			expect(c.ui.credits.withClaude).toHaveLength(2);
		}
	});

	test("язык браузера: первый поддерживаемый, иначе английский", () => {
		expect(pickLang(["es-MX", "en"])).toBe("es");
		expect(pickLang(["zh-Hans-CN"])).toBe("zh");
		expect(pickLang(["de-DE", "ru"])).toBe("ru");
		expect(pickLang(["fr-FR"])).toBe("en");
	});
});
