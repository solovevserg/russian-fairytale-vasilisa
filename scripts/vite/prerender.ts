import {createServer, type Plugin} from "vite";

/** Что отдаёт точка входа пререндера (src/ssg/render.tsx). */
interface RenderModule {
	LANG_IDS: string[];
	DEFAULT_LANG: string;
	LANG_KEY: string;
	chooseLang: (...args: unknown[]) => string;
	renderPage: (lang: string) => string;
}

const ROOT = '<div id="root"></div>';

/**
 * Скрипт до первой отрисовки: выбирает язык по тем же правилам, что
 * приложение (исходник chooseLang вставляется как есть), и, если это не язык
 * по умолчанию, подставляет в #root готовый текст на нём из <template>.
 */
function langScript(mod: RenderModule): string {
	return `(function () {
	try {
		var saved = null;
		try { saved = localStorage.getItem(${JSON.stringify(mod.LANG_KEY)}); } catch (e) {}
		var nav = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
		var lang = (${mod.chooseLang.toString()})(${JSON.stringify(mod.LANG_IDS)}, new URLSearchParams(location.search).get("lang"), saved, nav);
		if (lang === ${JSON.stringify(mod.DEFAULT_LANG)}) return;
		var page = document.getElementById("ssg-" + lang);
		var root = document.getElementById("root");
		if (page && root) root.replaceChildren(page.content.cloneNode(true));
	} catch (e) {}
})();`;
}

export interface PrerenderOptions {
	/** Модуль с renderPage и правилами выбора языка (путь от корня проекта). */
	entry: string;
}

/**
 * Готовый текст сказки в index.html: страница рендерится на всех языках при
 * сборке (SSR-режим Vite), и браузер показывает текст, не дожидаясь JS
 * (1,2 МБ на телефоне — секунды). Язык по умолчанию — прямо в #root,
 * остальные — в <template>; скрипт до первой отрисовки выбирает нужный.
 * Клиент потом рендерит приложение поверх (main.tsx) — та же разметка.
 */
export function prerender({entry}: PrerenderOptions): Plugin {
	let configFile: string | undefined;
	return {
		name: "prerender",
		apply: "build",
		configResolved(config) {
			configFile = config.configFile;
		},
		transformIndexHtml: {
			order: "post",
			async handler(html) {
				if (!html.includes(ROOT)) {
					throw new Error(`prerender: в index.html нет ${ROOT}`);
				}
				const server = await createServer({
					configFile,
					mode: "production",
					// свой кэш: иначе production-сборки зависимостей (react/jsx-dev-runtime
					// без jsxDEV) попадут в общий node_modules/.vite и сломают dev-сервер
					cacheDir: "node_modules/.vite-prerender",
					optimizeDeps: {noDiscovery: true, include: []},
					appType: "custom",
					logLevel: "error",
					server: {middlewareMode: true, hmr: false, watch: null},
				});
				try {
					const mod = (await server.ssrLoadModule(entry)) as RenderModule;
					const pages = mod.LANG_IDS.map((lang) => ({
						lang,
						markup: mod.renderPage(lang),
					}));
					const main = pages.find((p) => p.lang === mod.DEFAULT_LANG);
					if (!main) throw new Error("prerender: нет языка по умолчанию");
					const templates = pages
						.filter((p) => p !== main)
						.map((p) => `<template id="ssg-${p.lang}">${p.markup}</template>`)
						.join("");
					return html.replace(
						ROOT,
						`<div id="root">${main.markup}</div>${templates}<script>${langScript(mod)}</script>`,
					);
				} finally {
					await server.close();
				}
			},
		},
	};
}
