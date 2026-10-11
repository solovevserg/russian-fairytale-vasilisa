import {StrictMode} from "react";
import {renderToString} from "react-dom/server";

import {App} from "../App";
import {type Lang, useLangStore} from "../i18n/lang";

export {chooseLang, DEFAULT_LANG, LANG_IDS, LANG_KEY} from "../i18n/lang";

/**
 * Разметка страницы на языке `lang` — для готового текста в index.html
 * (scripts/vite/prerender.ts). Сцены в ней нет: она монтируется после первой
 * отрисовки (useAfterFirstPaint).
 */
export function renderPage(lang: Lang): string {
	useLangStore.setState({lang});
	return renderToString(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
