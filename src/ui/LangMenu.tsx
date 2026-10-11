import { useEffect, useRef, useState } from "react";
import { useContent } from "../i18n/content";
import { LANGS, type Lang, useLangStore } from "../i18n/lang";
import { autoReader } from "../reader/autoReader";
import { useReaderStore } from "../reader/readerStore";

/** Кнопка с флагом текущего языка и выпадающий список языков. */
export function LangMenu() {
	const lang = useLangStore((s) => s.lang);
	const setLang = useLangStore((s) => s.setLang);
	const label = useContent().ui.language;
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

	// закрывается щелчком мимо и клавишей Escape
	useEffect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (!root.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			root.current?.querySelector<HTMLButtonElement>("button")?.focus();
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const choose = (next: Lang) => {
		setOpen(false);
		if (next === lang) return;
		// озвучка на прежнем языке прерывается вместе с автопрокруткой
		if (useReaderStore.getState().playing) autoReader.stop();
		setLang(next);
	};

	return (
		<div className="lang-menu" ref={root}>
			<button
				type="button"
				className="control-button control-button--icon"
				aria-label={`${label}: ${current.name}`}
				title={label}
				aria-haspopup="true"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
			>
				<span aria-hidden="true">{current.flag}</span>
			</button>
			{open && (
				<ul className="lang-menu__list" aria-label={label}>
					{LANGS.map((l) => (
						<li key={l.id}>
							<button
								type="button"
								className="lang-menu__item"
								lang={l.id}
								aria-current={l.id === lang ? "true" : undefined}
								onClick={() => choose(l.id)}
							>
								<span aria-hidden="true">{l.flag}</span>
								{l.name}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
