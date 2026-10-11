import { currentContent } from "../i18n/content";
import { splitSentences } from "./timing";

export function isSpeechSupported(): boolean {
	return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Голоса грузятся асинхронно (особенно в Chrome) — ждём их один раз и недолго. */
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
	const synth = window.speechSynthesis;
	const voices = synth.getVoices();
	if (voices.length > 0) return Promise.resolve(voices);
	voicesPromise ??= new Promise((resolve) => {
		const done = () => resolve(synth.getVoices());
		synth.addEventListener("voiceschanged", done, { once: true });
		window.setTimeout(done, 1500);
	});
	return voicesPromise;
}

const chosenVoices = new Map<string, SpeechSynthesisVoice | null>();

/** Голос для языка (ru-RU, en-GB…); в Chrome лучше всего звучат голоса Google. */
async function voiceFor(lang: string): Promise<SpeechSynthesisVoice | null> {
	const cached = chosenVoices.get(lang);
	if (cached !== undefined) return cached;
	const prefix = lang.slice(0, 2).toLowerCase();
	const voices = (await loadVoices()).filter((v) =>
		v.lang.toLowerCase().startsWith(prefix),
	);
	const exact = voices.filter(
		(v) => v.lang.toLowerCase() === lang.toLowerCase(),
	);
	const voice =
		exact.find((v) => /google/i.test(v.name)) ??
		voices.find((v) => /google/i.test(v.name)) ??
		voices.find((v) => !v.localService) ??
		exact[0] ??
		voices[0] ??
		null;
	chosenVoices.set(lang, voice);
	return voice;
}

/** true — фраза прозвучала; false — синтез не сработал (нет голосов, ошибка). */
function speakOne(
	text: string,
	voice: SpeechSynthesisVoice | null,
	lang: string,
	signal: AbortSignal,
): Promise<boolean> {
	return new Promise((resolve) => {
		if (signal.aborted) return resolve(true);
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = lang;
		if (voice) utterance.voice = voice;
		utterance.rate = 0.95;
		utterance.pitch = 1;
		const finish = (ok: boolean) => () => {
			signal.removeEventListener("abort", onAbort);
			resolve(ok);
		};
		const onAbort = finish(true);
		utterance.onend = finish(true);
		// ошибка синтеза не должна вешать автопрокрутку
		utterance.onerror = (event) =>
			finish(event.error === "interrupted" || event.error === "canceled")();
		signal.addEventListener("abort", onAbort, { once: true });
		window.speechSynthesis.speak(utterance);
	});
}

/**
 * Читает абзацы вслух по предложениям. `onParagraph` сообщает, какой абзац
 * сейчас звучит (для подсветки). Прерывается через `signal`.
 * Возвращает false, если озвучить не удалось (нет голосов) — тогда
 * автопрокрутка просто даёт время на чтение.
 */
export async function narrate(
	paragraphs: string[],
	signal: AbortSignal,
	onParagraph: (index: number) => void,
): Promise<boolean> {
	if ((await loadVoices()).length === 0) return false;
	const lang = currentContent().speechLang;
	const voice = await voiceFor(lang);
	const stop = () => window.speechSynthesis.cancel();
	signal.addEventListener("abort", stop, { once: true });
	try {
		for (const [index, paragraph] of paragraphs.entries()) {
			onParagraph(index);
			for (const sentence of splitSentences(paragraph)) {
				if (signal.aborted) return true;
				if (!(await speakOne(sentence, voice, lang, signal))) return false;
			}
		}
		return true;
	} finally {
		signal.removeEventListener("abort", stop);
	}
}
