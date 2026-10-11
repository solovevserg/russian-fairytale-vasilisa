import {fileURLToPath} from "node:url";

import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

import {ezTreeTextures} from "./scripts/vite/ezTreeTextures";
import {glslWhitespace} from "./scripts/vite/glslWhitespace";
import {preloadFonts} from "./scripts/vite/preloadFonts";
import {prerender} from "./scripts/vite/prerender";
import {serviceWorker} from "./scripts/vite/serviceWorker";

export default defineConfig({
	base: "/russian-fairytale-vasilisa/",
	build: {
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						// библиотеки — отдельным файлом: он меняется только при обновлении
						// зависимостей, а не с каждым пушем, и остаётся в кэше браузера.
						// ez-tree со своими текстурами грузится отдельно (по требованию),
						// стили (шрифты) — вместе с нашими: один CSS вместо двух.
						{
							name: "vendor",
							test: /node_modules[\\/](?!@dgreenheck[\\/]ez-tree).*\.[cm]?[jt]sx?$/,
						},
					],
				},
			},
		},
	},
	plugins: [
		react(),
		ezTreeTextures({
			qualityModule: fileURLToPath(
				new URL("./src/scene/quality.ts", import.meta.url),
			),
			loaderModule: fileURLToPath(
				new URL("./src/scene/forest/bitmapTextureLoader.ts", import.meta.url),
			),
		}),
		glslWhitespace(),
		// шрифты заголовков и текста на русском (язык по умолчанию)
		preloadFonts([
			/ruslan-display-cyrillic-400-normal-.+\.woff2$/,
			/old-standard-tt-cyrillic-400-normal-.+\.woff2$/,
		]),
		// готовый текст сказки в index.html — виден до загрузки JS
		prerender({entry: "/src/ssg/render.tsx"}),
		serviceWorker({
			entry: fileURLToPath(new URL("./src/sw/sw.ts", import.meta.url)),
		}),
	],
});
