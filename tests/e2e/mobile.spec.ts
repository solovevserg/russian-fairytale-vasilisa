import { expect, type Page, test } from "@playwright/test";
import { chapters } from "../../src/story/chapters";

// Мобильная раскладка: главы — горизонтальная полоса карточек внизу экрана
// поверх сцены. Облегчённая сцена — проверяем вёрстку и поведение, а не графику.
const LIGHT = "./?noforest&nograss&noshadows";

test.beforeEach(({ isMobile }) => {
	test.skip(!isMobile, "только мобильная раскладка");
});

function activeChapter(page: Page) {
	return page.evaluate(
		() =>
			(
				window as unknown as {
					__STORY__: { getState: () => { activeChapter: number } };
				}
			).__STORY__.getState().activeChapter,
	);
}

test("главы листаются по горизонтали, страница не уезжает вбок", async ({
	page,
}) => {
	await page.goto(LIGHT);
	const story = page.locator(".story");
	await expect(story).toBeVisible();
	// страница целиком — без горизонтальной прокрутки, листается только полоса
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - window.innerWidth,
	);
	expect(overflow).toBeLessThanOrEqual(0);

	// карточка главы — по ширине экрана (с полями), а не шире
	const width = await page.evaluate(() => window.innerWidth);
	const card = await page.locator('[data-keyframe="fire"]').boundingBox();
	expect(card?.width).toBeLessThanOrEqual(width);

	// листаем полосу на две карточки — активна вторая глава
	await page.evaluate(() => {
		document
			.querySelector('[data-keyframe="fire"]')
			?.scrollIntoView({ inline: "center", block: "nearest" });
	});
	await expect.poll(() => activeChapter(page)).toBe(1);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("на первом экране — подсказка «листайте», после листания она скрывается", async ({
	page,
}) => {
	await page.goto(LIGHT);
	const hint = page.locator(".swipe-hint");
	await expect(hint).toHaveClass(/swipe-hint--shown/);
	await page.evaluate(() => {
		document
			.querySelector('[data-keyframe="prologue"]')
			?.scrollIntoView({ inline: "center", block: "nearest" });
	});
	await expect(hint).not.toHaveClass(/swipe-hint--shown/);
});

test("кнопка чтения подписана коротко, меню языков не выходит за экран", async ({
	page,
}) => {
	await page.goto(LIGHT);
	const play = page.locator(".control-button--primary");
	await expect(play.locator(".control-button__short")).toBeVisible();
	// полная подпись остаётся только для скринридеров — визуально скрыта
	const full = await play.locator(".control-button__full").boundingBox();
	expect(full?.width ?? 0).toBeLessThanOrEqual(1);

	await page.locator(".lang-menu > button").tap();
	const list = page.locator(".lang-menu__list");
	await expect(list).toBeVisible();
	const box = await list.boundingBox();
	const viewport = page.viewportSize();
	expect(box).not.toBeNull();
	if (box && viewport) {
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
		expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
	}
});

test("карточка пролога не прокручивается по вертикали", async ({ page }) => {
	await page.goto(LIGHT);
	const extra = await page
		.locator('[data-keyframe="prologue"]')
		.evaluate((el) => el.scrollHeight - el.clientHeight);
	expect(extra).toBeLessThanOrEqual(1);
});

test("автопрокрутка доходит до финальной карточки с автором и посвящением", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await page.addInitScript(() =>
		window.localStorage.setItem("izbushka:narrate", "off"),
	);
	await page.goto(`${LIGHT}&readtime=1`);
	// с эпилога: дальше — только финальная карточка
	const last = chapters.length - 1;
	await page.evaluate((id) => {
		document
			.querySelector(`[data-keyframe="${id}"]`)
			?.scrollIntoView({ inline: "center", block: "nearest" });
	}, chapters[last].id);
	await expect.poll(() => activeChapter(page)).toBe(last);
	await page.locator(".control-button--primary").tap();
	const credits = page.locator(".story__credits");
	await expect(credits).toContainText("Посвящается моей жене Стефании");
	// финальная карточка встаёт в центр полосы
	await expect
		.poll(
			async () => {
				const box = await credits.boundingBox();
				const width = page.viewportSize()?.width ?? 0;
				return box ? Math.abs(box.x + box.width / 2 - width / 2) : 999;
			},
			{ timeout: 60_000 },
		)
		.toBeLessThan(4);
});
