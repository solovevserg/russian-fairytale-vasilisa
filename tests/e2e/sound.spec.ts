import { expect, test } from "@playwright/test";

test("кнопка звука включает и выключает звук без ошибок", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));

	await page.goto("./?noforest&noshadows");
	const toggle = page.locator(".sound-toggle");
	await expect(toggle).toHaveAttribute("aria-pressed", "false");

	const ambience = page.waitForResponse((r) =>
		r.url().includes("/audio/amb-forest-day."),
	);
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	expect((await ambience).ok()).toBe(true);

	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	expect(errors).toEqual([]);
});
