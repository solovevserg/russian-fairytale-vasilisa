/**
 * Положение мыши для лёгкого параллакса камеры: x, y в диапазоне -1..1
 * (0 — центр окна). На сенсорных экранах и при «уменьшить движение» — всегда 0.
 */
export const pointer = { x: 0, y: 0 };

/** Амплитуда параллакса как доля расстояния от камеры до цели. */
export const PARALLAX_SHIFT = 0.025;
/** Насколько сильнее (относительно сдвига камеры) доворачивается взгляд. */
export const PARALLAX_LOOK = 4.5;

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
