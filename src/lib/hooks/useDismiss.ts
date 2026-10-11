import {type RefObject, useEffect} from "react";

/**
 * Закрытие всплывающего элемента: щелчок мимо `root` или клавиша Escape
 * вызывают `onDismiss`. Слушает, только пока `open`. После Escape фокус
 * возвращается на первую кнопку внутри `root` (обычно — та, что открыла).
 */
export function useDismiss(
	root: RefObject<HTMLElement | null>,
	open: boolean,
	onDismiss: () => void,
): void {
	useEffect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (!root.current?.contains(event.target as Node)) onDismiss();
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			onDismiss();
			root.current?.querySelector<HTMLButtonElement>("button")?.focus();
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [root, open, onDismiss]);
}
