import {expect, test} from "@playwright/test";

// Сервис-воркер (src/sw): после первого визита он докачивает в фоне всё
// нужное устройству (модели, текстуры, звук) — сайт открывается и без сети.
test("после первого визита сайт открывается без сети", async ({
	page,
	context,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "воркер тот же на телефоне");
	test.setTimeout(120_000);
	const url = "./?noforest&nograss&noshadows";
	await page.goto(url);
	await page.evaluate(() => navigator.serviceWorker.ready);
	// второй заход — уже под управлением воркера: он кладёт файлы в кэш
	await page.reload();
	await page.waitForSelector("canvas");
	await expect
		.poll(
			() =>
				page.evaluate(async () => {
					const cache = await caches.open("vasilisa");
					return (await cache.keys()).map((r) => {
						const {pathname, search} = new URL(r.url);
						return pathname + search;
					});
				}),
			{timeout: 60_000},
		)
		.toEqual(
			expect.arrayContaining([
				expect.stringMatching(/index\.html\?rev=/),
				expect.stringMatching(/models\/vasilisa(-mobile)?\.glb\?rev=/),
				expect.stringMatching(/textures\/ground\/.*\.webp\?rev=/),
				// докачано в фоне, хотя ещё не открывалось: музыка, модель Бабы-яги
				expect.stringMatching(/audio\/music-hut\.(webm|mp3)\?rev=/),
				expect.stringMatching(/models\/baba-yaga\.glb\?rev=/),
			]),
		);

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole("heading", {level: 1})).toHaveText(
		"Василиса Прекрасная",
	);
	await expect(page.locator(".scene canvas")).toBeVisible();
});
