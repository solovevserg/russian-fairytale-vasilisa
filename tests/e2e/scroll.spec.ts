import { expect, type Page, test } from "@playwright/test";
import { chapters } from "../../src/story/chapters";

interface StoryState {
	progress: number;
	activeChapter: number;
}

function storyState(page: Page) {
	return page.evaluate(() =>
		(
			window as unknown as { __STORY__: { getState: () => StoryState } }
		).__STORY__.getState(),
	);
}

async function scrollToChapter(page: Page, id: string) {
	await page.evaluate((chapterId) => {
		const el = document.querySelector(`[data-keyframe="${chapterId}"]`);
		if (!el) throw new Error(`chapter ${chapterId} not found`);
		const rect = el.getBoundingClientRect();
		window.scrollTo(
			0,
			rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2,
		);
	}, id);
}

test("прокрутка переключает активную главу", async ({ page }) => {
	// проверяем логику прокрутки, а не графику: облегчённая сцена,
	// чтобы программный WebGL в headless-браузере не тормозил кадры
	await page.goto("./?noforest&noshadows");
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
