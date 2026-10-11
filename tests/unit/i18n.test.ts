import { describe, expect, test } from "bun:test";
import { CONTENT } from "../../src/i18n/content";
import { LANGS, pickLang } from "../../src/i18n/lang";

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

	test("у интерфейса на всех языках один и тот же набор строк", () => {
		for (const other of others)
			expect(Object.keys(other.ui).sort()).toEqual(Object.keys(ru.ui).sort());
	});

	test("язык браузера: первый поддерживаемый, иначе английский", () => {
		expect(pickLang(["es-MX", "en"])).toBe("es");
		expect(pickLang(["zh-Hans-CN"])).toBe("zh");
		expect(pickLang(["de-DE", "ru"])).toBe("ru");
		expect(pickLang(["fr-FR"])).toBe("en");
	});
});
