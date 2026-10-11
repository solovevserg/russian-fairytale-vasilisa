/**
 * Положение мыши для лёгкого параллакса камеры: x, y в диапазоне -1..1
 * (0 — центр окна). На сенсорных экранах вместо мыши — медленное покачивание
 * (см. swayPointer), при «уменьшить движение» — всегда 0.
 */
export const pointer = { x: 0, y: 0 };

/** Амплитуда параллакса как доля расстояния от камеры до цели. */
export const PARALLAX_SHIFT = 0.025;
/** Насколько сильнее (относительно сдвига камеры) доворачивается взгляд. */
export const PARALLAX_LOOK = 4.5;

/** Покачивание камеры без мыши: доля полного отклонения и периоды, с. */
const SWAY = { amount: 0.45, periodX: 11, periodY: 17 };

/**
 * Медленная «дыхательная» восьмёрка: два синуса с несоизмеримыми периодами,
 * чтобы движение не повторялось и не укачивало.
 */
export function swayAt(time: number, out = { x: 0, y: 0 }) {
	const tau = Math.PI * 2;
	out.x = SWAY.amount * Math.sin((time / SWAY.periodX) * tau);
	out.y = SWAY.amount * 0.6 * Math.sin((time / SWAY.periodY) * tau + 1.3);
	return out;
}

/** true — курсора нет (телефон, планшет): камера покачивается сама. */
export const autoSway =
	typeof window !== "undefined" &&
	!window.matchMedia("(pointer: fine)").matches &&
	!window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Вызывается каждый кадр: на сенсорных экранах ведёт «указатель» по кругу. */
export function swayPointer(time: number) {
	if (autoSway) swayAt(time, pointer);
}

if (typeof window !== "undefined") {
	const finePointer = window.matchMedia("(pointer: fine)");
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	window.addEventListener(
		"pointermove",
		(event) => {
			if (
				event.pointerType !== "mouse" ||
				!finePointer.matches ||
				reducedMotion.matches
			)
				return;
			pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
			pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
		},
		{ passive: true },
	);
	// мышь ушла из окна — камера плавно возвращается на место
	document.documentElement.addEventListener("pointerleave", () => {
		pointer.x = 0;
		pointer.y = 0;
	});
}
