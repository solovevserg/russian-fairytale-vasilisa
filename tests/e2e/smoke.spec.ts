import {expect, test} from "@playwright/test";

import {chapters} from "../../src/story/chapters";

test("страница открывается без ошибок и показывает сцену и текст", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(msg.text());
	});

	await page.goto("./");

	await expect(page.getByRole("heading", {level: 1})).toHaveText(
		"Василиса Прекрасная",
	);
	await expect(page.locator("section.chapter")).toHaveCount(chapters.length);
	await expect(page.locator(".scene canvas")).toBeVisible();

	expect(errors).toEqual([]);
});

test("ссылка ?lang= открывает версию на языке; метатеги для поиска и превью на месте", async ({
	page,
}) => {
	await page.goto("./?lang=es&noforest&nograss&noshadows");
	await expect(page.getByRole("heading", {level: 1})).toHaveText(
		"Vasilisa la Hermosa",
	);
	await expect(page).toHaveTitle(/Vasilisa la Hermosa/);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/cuento popular ruso/,
	);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
		"content",
		/og-image\.jpg$/,
	);
	await expect(page.locator('link[hreflang="zh-Hans"]')).toHaveCount(1);
});
