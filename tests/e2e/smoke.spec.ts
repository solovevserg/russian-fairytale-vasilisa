import { expect, test } from "@playwright/test";
import { chapters } from "../../src/story/chapters";

test("страница открывается без ошибок и показывает сцену и текст", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(msg.text());
	});

	await page.goto("./");

	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Василиса Прекрасная",
	);
	await expect(page.locator("section.chapter")).toHaveCount(chapters.length);
	await expect(page.locator(".scene canvas")).toBeVisible();

	expect(errors).toEqual([]);
});
