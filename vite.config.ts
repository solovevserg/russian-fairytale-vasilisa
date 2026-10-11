import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

import {ezTreeTextures} from "./scripts/vite/ezTreeTextures";
import {glslWhitespace} from "./scripts/vite/glslWhitespace";

export default defineConfig({
	base: "/russian-fairytale-vasilisa/",
	plugins: [react(), ezTreeTextures(), glslWhitespace()],
});
