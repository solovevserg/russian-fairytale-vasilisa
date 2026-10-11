import {useEffect, useState} from "react";

/** Не дольше скольких мс ждать, пока браузер освободится, после первой отрисовки. */
const IDLE_TIMEOUT = 1500;

/**
 * false до первой отрисовки страницы, потом — когда браузер освободится (но
 * не дольше IDLE_TIMEOUT) — true. Для тяжёлого содержимого, которое не
 * должно задерживать показ текста: страница сначала рисуется, потом оно.
 */
export function useAfterFirstPaint(): boolean {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		let idle: number | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		// rAF — перед отрисовкой; второй rAF — уже после неё
		const frame = requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const done = () => setReady(true);
				if ("requestIdleCallback" in window) {
					idle = requestIdleCallback(done, {timeout: IDLE_TIMEOUT});
				} else {
					timer = setTimeout(done, 0);
				}
			});
		});
		return () => {
			cancelAnimationFrame(frame);
			if (idle !== undefined) cancelIdleCallback(idle);
			if (timer !== undefined) clearTimeout(timer);
		};
	}, []);
	return ready;
}
