import { describe, expect, test } from "bun:test";
import { CONTENT } from "../../src/i18n/content";

describe("переводы", () => {
	const ru = CONTENT.ru;
	const en = CONTENT.en;

	test("главы на обоих языках совпадают по id и числу абзацев", () => {
		expect(en.chapters.map((c) => c.id)).toEqual(ru.chapters.map((c) => c.id));
		en.chapters.forEach((c, i) => {
			expect(c.paragraphs.length).toBe(ru.chapters[i].paragraphs.length);
			expect(c.title.length).toBeGreaterThan(0);
		});
	});

	test("подписи глав: зачин, главы по порядку, концовка", () => {
		const last = ru.chapters.length - 1;
		expect(ru.caption(0)).toBe("Зачин");
		expect(ru.caption(1)).toBe("Глава первая");
		expect(ru.caption(last)).toBe("Концовка");
		expect(en.caption(0)).toBe("Beginning");
		expect(en.caption(2)).toBe("Chapter Two");
		expect(en.caption(last)).toBe("Ending");
	});

	test("у интерфейса на обоих языках один и тот же набор строк", () => {
		expect(Object.keys(en.ui).sort()).toEqual(Object.keys(ru.ui).sort());
	});
});
