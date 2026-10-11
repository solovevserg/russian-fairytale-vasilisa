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
	// озвучка проверяется вручную: здесь — только логика прокрутки
	await page.addInitScript(() =>
		window.localStorage.setItem("izbushka:narrate", "off"),
	);
	// readtime=1 — секунда на чтение вместо десяти; лес и трава отключены:
	// в CI WebGL программный, и полная сцена тормозит страницу до таймаутов
	await page.goto("./?noforest&nograss&noshadows&readtime=1");
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
	await page.goto("./?noforest&nograss&noshadows");
	const html = page.locator("html");
	await expect(html).toHaveAttribute("data-theme", "light");

	await page.getByRole("button", { name: "Тёмная тема" }).click();
	await expect(html).toHaveAttribute("data-theme", "dark");

	await page.reload();
	await expect(html).toHaveAttribute("data-theme", "dark");
});

test("язык переключается на лету и запоминается", async ({ page }) => {
	await page.goto("./?noforest&nograss&noshadows");
	const title = page.getByRole("heading", { level: 1 });
	await expect(title).toHaveText("Василиса Прекрасная");

	await page.getByRole("button", { name: "Язык: Русский" }).click();
	// список не уезжает за край экрана (на мобильных кнопка — справа)
	const menu = await page.locator(".lang-menu__list").boundingBox();
	const width = page.viewportSize()?.width ?? 0;
	expect(menu?.x).toBeGreaterThanOrEqual(0);
	expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(width);
	await page.getByRole("button", { name: "English" }).click();
	await expect(title).toHaveText("Vasilisa the Beautiful");
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
	await expect(
		page.getByRole("button", { name: /Read the tale/ }),
	).toBeVisible();

	await page.reload();
	await expect(title).toHaveText("Vasilisa the Beautiful");
	await page.getByRole("button", { name: "Language: English" }).click();
	await page.getByRole("button", { name: "中文" }).click();
	await expect(title).toHaveText("美丽的瓦西丽莎");
	await expect(page.locator("html")).toHaveAttribute("lang", "zh");

	await page.getByRole("button", { name: "语言: 中文" }).click();
	await page.getByRole("button", { name: "Español" }).click();
	await expect(title).toHaveText("Vasilisa la Hermosa");

	await page.getByRole("button", { name: "Idioma: Español" }).click();
	await page.getByRole("button", { name: "Русский" }).click();
	await expect(title).toHaveText("Василиса Прекрасная");
});
