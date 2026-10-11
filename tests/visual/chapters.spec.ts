import { expect, test } from "@playwright/test";

import { chapters } from "../../src/story/chapters";

/**
 * Каждая остановка истории — титул, главы, титры — снимком. Камера не
 * покачивается (?still), но ветер и птицы анимированы — кадр неподвижным не бывает,
 * поэтому снимок сравнивается с эталоном как картинка, с допуском
 * (playwright.visual.config.ts), без ожидания неподвижного кадра.
 */
const STOPS = ["start", ...chapters.map((c) => c.id), "credits"];
/** Сколько сцена идёт после открытия до снимка, мс. */
const SETTLE_MS = 5000;

for (const [index, id] of STOPS.entries()) {
	test(`${String(index).padStart(2, "0")} ${id}`, async ({ page }) => {
		await page.goto(`./?instant&still#${id}`);
		await page.waitForSelector("canvas");
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(SETTLE_MS);
		expect(await page.screenshot()).toMatchSnapshot(`${id}.png`);
	});
}
