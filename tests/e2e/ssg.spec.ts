import {expect, test} from "@playwright/test";

import {chapters} from "../../src/story/chapters";

// Готовый текст в index.html (scripts/vite/prerender.ts): виден, не дожидаясь
// JS, — и сразу на языке читателя.

test.describe("без JS", () => {
	test.use({javaScriptEnabled: false});

	test("текст сказки и главы уже в HTML", async ({page}) => {
		await page.goto("./");
		await expect(page.getByRole("heading", {level: 1})).toHaveText(
			"Василиса Прекрасная",
		);
		await expect(page.locator("section.chapter")).toHaveCount(chapters.length);
		await expect(page.locator(".dropcap")).toHaveCount(chapters.length);
	});
});

test.describe("до загрузки JS", () => {
	test.use({locale: "en-US"});

	test("текст на языке браузера", async ({page}) => {
		// код приложения не грузится — работает только скрипт выбора языка в HTML
		await page.route(/\/assets\/.+\.js$/, (route) => route.abort());
		await page.goto("./");
		await expect(page.getByRole("heading", {level: 1})).toHaveText(
			"Vasilisa the Beautiful",
		);
	});

	test("?lang= важнее языка браузера", async ({page}) => {
		await page.route(/\/assets\/.+\.js$/, (route) => route.abort());
		await page.goto("./?lang=es");
		await expect(page.getByRole("heading", {level: 1})).toHaveText(
			"Vasilisa la Hermosa",
		);
	});
});

test("приложение встаёт поверх готового текста без ошибок", async ({page}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(msg.text());
	});
	await page.goto("./?lang=zh&noforest&nograss&noshadows");
	await expect(page.getByRole("heading", {level: 1})).toHaveText(
		"美丽的瓦西丽莎",
	);
	await expect(page.locator(".scene canvas")).toBeVisible();
	await expect(page.locator("section.chapter")).toHaveCount(chapters.length);
	expect(errors).toEqual([]);
});
