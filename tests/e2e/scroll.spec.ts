import {expect, type Page, test} from "@playwright/test";

import {chapters} from "../../src/story/chapters";

interface StoryState {
	progress: number;
	activeChapter: number;
}

function storyState(page: Page) {
	return page.evaluate(() =>
		(
			window as unknown as {__STORY__: {getState: () => StoryState}}
		).__STORY__.getState(),
	);
}

async function scrollToChapter(page: Page, id: string) {
	await page.evaluate((chapterId) => {
		const el = document.querySelector(`[data-keyframe="${chapterId}"]`);
		if (!el) throw new Error(`chapter ${chapterId} not found`);
		// на мобильных главы листаются горизонтально — scrollIntoView работает для обеих осей
		el.scrollIntoView({block: "center", inline: "center"});
	}, id);
}

test("прокрутка переключает активную главу", async ({page}) => {
	// проверяем логику прокрутки, а не графику: облегчённая сцена,
	// (без леса и травы), чтобы программный WebGL в headless-браузере не тормозил кадры
	await page.goto("./?noforest&nograss&noshadows");
	await expect(page.locator(".scene canvas")).toBeVisible();
	expect((await storyState(page)).activeChapter).toBe(0);

	for (const index of [4, chapters.length - 1, 1]) {
		await scrollToChapter(page, chapters[index].id);
		await expect
			.poll(async () => (await storyState(page)).activeChapter)
			.toBe(index);
		await expect(
			page.locator(`[data-keyframe="${chapters[index].id}"]`),
		).toHaveAttribute("aria-current", "step");
	}
});

test("ссылка с якорем открывает главу, кнопки ↑/↓ листают главы", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "кнопки глав — только на десктопе");
	const skull = chapters.findIndex((c) => c.id === "skull");
	await page.goto("./?noforest&nograss&noshadows#skull");
	await expect
		.poll(async () => (await storyState(page)).activeChapter)
		.toBe(skull);

	await page.getByRole("button", {name: "Следующая глава"}).click();
	await expect
		.poll(async () => (await storyState(page)).activeChapter)
		.toBe(skull + 1);
	await expect
		.poll(() => page.evaluate(() => window.location.hash))
		.toBe(`#${chapters[skull + 1].id}`);
});
