import { audioEngine } from "../audio/AudioEngine";
import { currentContent } from "../i18n/content";
import { useStoryStore } from "../state/storyStore";
import { chapters } from "../story/chapters";
import {
	scrollPosition,
	scrollPositionFor,
	setScrollPosition,
} from "../ui/scrollAxis";
import { narrate } from "./narrator";
import { useReaderStore } from "./readerStore";
import { easeInOutCubic, readingSeconds } from "./timing";

/** Длительность перехода между главами, мс. */
const SCROLL_MS = 2600;
/** Пауза после озвучки перед переходом, мс. */
const AFTER_NARRATION_MS = 1500;

/** ?readtime=2 — короткие паузы (для тестов и отладки), в секундах. */
function readTimeOverride(): number | null {
	const value = Number.parseFloat(
		new URLSearchParams(window.location.search).get("readtime") ?? "",
	);
	return Number.isFinite(value) ? value : null;
}

function prefersReducedMotion() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timer = window.setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				window.clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});
}

/** Плавная прокрутка к главе своей анимацией (а не scroll-behavior) — ради управляемости. */
function scrollToChapter(index: number, signal: AbortSignal): Promise<void> {
	const el = document.querySelectorAll<HTMLElement>("[data-keyframe]")[index];
	if (!el) return Promise.resolve();
	const target = scrollPositionFor(el);
	const from = scrollPosition();
	if (prefersReducedMotion() || Math.abs(target - from) < 2) {
		setScrollPosition(target);
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const start = performance.now();
		const step = (now: number) => {
			if (signal.aborted) return resolve();
			const t = (now - start) / SCROLL_MS;
			setScrollPosition(from + (target - from) * easeInOutCubic(t));
			if (t < 1) requestAnimationFrame(step);
			else resolve();
		};
		requestAnimationFrame(step);
	});
}

/**
 * Автоматическое чтение: глава за главой — плавный переход, затем пауза на
 * чтение (или озвучка главы), и дальше. Любая ручная прокрутка — пауза.
 */
class AutoReader {
	private controller: AbortController | null = null;

	start() {
		if (this.controller) return;
		const controller = new AbortController();
		this.controller = controller;
		useReaderStore.getState().setPlaying(true);
		// CSS scroll-snap мешает плавной анимации прокрутки — на время чтения выключаем
		document.documentElement.classList.add("is-autoscrolling");
		this.listenForUser(controller.signal);
		void this.run(controller.signal).finally(() => {
			if (this.controller === controller) this.stop();
		});
	}

	stop() {
		this.controller?.abort();
		this.controller = null;
		const reader = useReaderStore.getState();
		reader.setPlaying(false);
		document.documentElement.classList.remove("is-autoscrolling");
		reader.setSpeaking(null);
		audioEngine.setDucked(false);
	}

	toggle() {
		if (this.controller) this.stop();
		else this.start();
	}

	private async run(signal: AbortSignal) {
		const { progress } = useStoryStore.getState();
		// если читатель уже на главе — начинаем с неё, иначе со следующей
		let index = Math.round(progress);
		const atChapter = Math.abs(progress - index) < 0.15 && scrollPosition() > 0;
		if (!atChapter) index = Math.ceil(progress);

		// с самого начала — сперва звучит название сказки
		if (
			index === 0 &&
			scrollPosition() < 50 &&
			useReaderStore.getState().narrate
		) {
			audioEngine.setDucked(true);
			const { title, subtitle } = currentContent();
			await narrate([`${title}. ${subtitle}.`], signal, () => {});
			audioEngine.setDucked(false);
			await wait(800, signal);
		}

		for (; index < chapters.length && !signal.aborted; index++) {
			await scrollToChapter(index, signal);
			if (signal.aborted) return;
			const reader = useReaderStore.getState();
			const chapter = currentContent().chapters[index];
			let narrated = false;
			if (reader.narrate) {
				audioEngine.setDucked(true);
				narrated = await narrate(
					[chapter.title, ...chapter.paragraphs],
					signal,
					(p) =>
						// абзац 0 — заголовок; подсвечиваем только абзацы текста
						useReaderStore
							.getState()
							.setSpeaking(p === 0 ? null : [index, p - 1]),
				);
				useReaderStore.getState().setSpeaking(null);
				audioEngine.setDucked(false);
			}
			if (narrated) await wait(AFTER_NARRATION_MS, signal);
			else
				await wait(
					(readTimeOverride() ?? readingSeconds(chapter)) * 1000,
					signal,
				);
		}
	}

	/** Колесо, касание или клавиши навигации — читатель взял управление на себя. */
	private listenForUser(signal: AbortSignal) {
		const pause = () => this.stop();
		const onKey = (event: KeyboardEvent) => {
			const keys = [
				"ArrowUp",
				"ArrowDown",
				"PageUp",
				"PageDown",
				"Home",
				"End",
				" ",
			];
			if (
				keys.includes(event.key) &&
				!(event.target instanceof HTMLButtonElement)
			)
				pause();
		};
		window.addEventListener("wheel", pause, { passive: true, signal });
		// касание кнопок панели (звук, тема, язык) — не повод останавливаться:
		// «Читать» сама переключает паузу, остальное чтению не мешает
		const onTouch = (event: TouchEvent) => {
			if (
				event.target instanceof Element &&
				event.target.closest(".control-bar")
			)
				return;
			pause();
		};
		window.addEventListener("touchstart", onTouch, { passive: true, signal });
		window.addEventListener("keydown", onKey, { signal });
	}
}

export const autoReader = new AutoReader();
