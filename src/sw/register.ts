import {audioExtension} from "../audio/sounds";
import {quality} from "../scene/quality";
import type {WarmMessage} from "./policy";

/** Через сколько после загрузки страницы начинать докачку для офлайна, мс. */
const WARM_DELAY = 5000;

function onIdle(fn: () => void): void {
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(fn, {timeout: 10_000});
	} else {
		setTimeout(fn, 0);
	}
}

/**
 * Регистрирует сервис-воркер (src/sw/sw.ts) после загрузки страницы, чтобы
 * не отнимать сеть у сцены, а когда браузер освободится — просит его
 * докачать всё нужное этому устройству для работы без сети: облегчённые
 * или полные ресурсы, звук в выбранном формате. С «экономией трафика»
 * докачки нет — кэшируется только то, что открывалось.
 */
export function registerServiceWorker(): void {
	if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
	window.addEventListener("load", async () => {
		try {
			await navigator.serviceWorker.register(
				`${import.meta.env.BASE_URL}sw.js`,
			);
			const registration = await navigator.serviceWorker.ready;
			const connection = (
				navigator as Navigator & {connection?: {saveData?: boolean}}
			).connection;
			if (connection?.saveData) return;
			// просим не вытеснять кэш при нехватке места (браузер может отказать)
			await navigator.storage?.persist?.().catch(() => false);
			setTimeout(
				() =>
					onIdle(() => {
						const message: WarmMessage = {
							type: "warm",
							device: {light: quality.lightAssets, audio: audioExtension()},
						};
						registration.active?.postMessage(message);
					}),
				WARM_DELAY,
			);
		} catch {
			// без воркера сайт работает как обычно — только без офлайна
		}
	});
}
