import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
	testDir: "tests/e2e",
	// WebGL-сцена в headless-браузере рендерится программно и грузит CPU:
	// параллельные воркеры мешают друг другу и ловят таймауты.
	workers: 1,
	timeout: 60_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}/russian-fairytale-vasilisa/`,
		trace: "on-first-retry",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: {
		command: `bun run build && bun run preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}/russian-fairytale-vasilisa/`,
		reuseExistingServer: !process.env.CI,
	},
});
