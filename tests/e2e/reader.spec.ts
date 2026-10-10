import { expect, type Page, test } from "@playwright/test";

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

test("автопрокрутка переходит от главы к главе и встаёт на паузу от колеса", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "колесо мыши — только на десктопе");
	// readtime=1 — секунда на чтение вместо десяти, чтобы тест был быстрым
	await page.goto("./?noforest&noshadows&readtime=1");
	const play = page.locator(".control-button--primary");
	await expect(play).toHaveAttribute("aria-pressed", "false");

	await play.click();
	await expect(play).toHaveAttribute("aria-pressed", "true");
	await expect
		.poll(() => activeChapter(page), { timeout: 15_000 })
		.toBeGreaterThanOrEqual(2);

	await page.mouse.move(1000, 400);
	await page.mouse.wheel(0, 100);
	await expect(play).toHaveAttribute("aria-pressed", "false");
});

test("тёмная тема переключается и запоминается", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("./?noforest&noshadows");
	const html = page.locator("html");
	await expect(html).toHaveAttribute("data-theme", "light");

	await page.getByRole("button", { name: "Тёмная тема" }).click();
	await expect(html).toHaveAttribute("data-theme", "dark");

	await page.reload();
	await expect(html).toHaveAttribute("data-theme", "dark");
});
