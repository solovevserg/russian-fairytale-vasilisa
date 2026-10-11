import {expect, test} from "@playwright/test";

import {chapters} from "../../src/story/chapters";

// Шейдеры в сборке сжимаются (scripts/vite/glslWhitespace.ts), а лес
// подгружается отдельным чанком: проходим все главы — в каждой свои
// материалы — и ждём, что ни один шейдер не упал при компиляции.
test("во всех главах сцена рисуется без ошибок шейдеров и консоли", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "шейдеры те же на телефоне");
	test.setTimeout(180_000);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (msg) => {
		if (
			msg.type() === "error" ||
			/Shader Error|WebGLProgram/.test(msg.text())
		) {
			errors.push(msg.text());
		}
	});

	await page.goto("./?instant");
	await page.waitForSelector("canvas");
	for (const {id} of chapters) {
		await page.evaluate((chapter) => {
			location.hash = chapter;
		}, id);
		await page.waitForTimeout(1500);
	}

	expect(errors).toEqual([]);
});
