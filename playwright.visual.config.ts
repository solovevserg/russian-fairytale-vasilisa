import {defineConfig} from "@playwright/test";

import base from "./playwright.config";

/**
 * Эталонные снимки глав (bun run test:visual). WebGL в CI рендерится
 * программно и нестабилен, поэтому запускаются локально — перед публикацией
 * правок сцены. Эталоны в git не хранятся: снять на чистом состоянии
 * (bun run test:visual --update-snapshots), внести правку, сравнить.
 */
export default defineConfig({
	...base,
	testDir: "tests/visual",
	timeout: 120_000,
	expect: {
		toMatchSnapshot: {maxDiffPixelRatio: 0.03, threshold: 0.25},
	},
	snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
});
