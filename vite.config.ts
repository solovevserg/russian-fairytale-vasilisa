import {fileURLToPath} from "node:url";

import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

import {ezTreeTextures} from "./scripts/vite/ezTreeTextures";
import {glslWhitespace} from "./scripts/vite/glslWhitespace";
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
						// ez-tree со своими текстурами грузится отдельно (по требованию).
						{
							name: "vendor",
							test: /node_modules[\\/](?!@dgreenheck[\\/]ez-tree)/,
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
		}),
		glslWhitespace(),
		serviceWorker({
			entry: fileURLToPath(new URL("./src/sw/sw.ts", import.meta.url)),
		}),
	],
});
