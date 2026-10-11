import type {Plugin} from "vite";

/**
 * Добавляет в index.html `<link rel="preload">` для шрифтов первого экрана:
 * иначе браузер узнаёт о них, только разобрав CSS и разложив страницу, и
 * текст долго стоит запасным шрифтом. Имена файлов — с хэшем, поэтому ищем
 * их в собранном бандле по шаблонам.
 */
export function preloadFonts(patterns: RegExp[]): Plugin {
	let base = "/";
	return {
		name: "preload-fonts",
		apply: "build",
		configResolved(config) {
			base = config.base;
		},
		transformIndexHtml: {
			order: "post",
			handler(_, {bundle}) {
				const files = Object.keys(bundle ?? {}).filter((file) =>
					patterns.some((pattern) => pattern.test(file)),
				);
				if (files.length !== patterns.length) {
					throw new Error(
						`preload-fonts: нашлось ${files.length} шрифтов из ${patterns.length}: ${files.join(", ")}`,
					);
				}
				return files.map((file) => ({
					tag: "link",
					attrs: {
						rel: "preload",
						as: "font",
						type: "font/woff2",
						href: base + file,
						crossorigin: "",
					},
					injectTo: "head" as const,
				}));
			},
		},
	};
}
