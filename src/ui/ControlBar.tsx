import { useEffect } from "react";
import { useContent } from "../i18n/content";
import { useLangStore } from "../i18n/lang";
import { autoReader } from "../reader/autoReader";
import { isSpeechSupported } from "../reader/narrator";
import { useReaderStore } from "../reader/readerStore";
import { SoundToggle } from "./SoundToggle";
import { useThemeStore } from "./theme";

/** Панель поверх сцены: чтение, озвучка, звук, тема, язык. */
export function ControlBar() {
	const playing = useReaderStore((s) => s.playing);
	const narrate = useReaderStore((s) => s.narrate);
	const setNarrate = useReaderStore((s) => s.setNarrate);
	const theme = useThemeStore((s) => s.theme);
	const toggleTheme = useThemeStore((s) => s.toggle);
	const lang = useLangStore((s) => s.lang);
	const setLang = useLangStore((s) => s.setLang);
	const content = useContent();
	const ui = content.ui;
	const speech = isSpeechSupported();

	// язык документа и заголовок вкладки — вслед за выбранным языком
	useEffect(() => {
		document.documentElement.lang = lang;
		document.title = content.documentTitle;
	}, [lang, content]);

	return (
		<div className="control-bar" role="toolbar" aria-label={ui.toolbar}>
			<button
				type="button"
				className="control-button control-button--primary"
				aria-pressed={playing}
				onClick={() => autoReader.toggle()}
			>
				<span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
				<span>{playing ? ui.pause : ui.read}</span>
			</button>
			{speech && (
				<button
					type="button"
					className="control-button"
					aria-pressed={narrate}
					title={ui.narrateTitle}
					onClick={() => setNarrate(!narrate)}
				>
					<span aria-hidden="true">🗣</span>
					<span className="control-button__label">
						{narrate ? ui.narrateOn : ui.narrate}
					</span>
				</button>
			)}
			<SoundToggle />
			<button
				type="button"
				className="control-button control-button--icon"
				aria-label={theme === "dark" ? ui.themeLight : ui.themeDark}
				title={theme === "dark" ? ui.themeLight : ui.themeDark}
				onClick={toggleTheme}
			>
				<span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
			</button>
			<button
				type="button"
				className="control-button control-button--icon control-button--lang"
				aria-label={ui.langSwitchTitle}
				title={ui.langSwitchTitle}
				onClick={() => {
					// озвучка на прежнем языке прерывается вместе с автопрокруткой
					if (useReaderStore.getState().playing) autoReader.stop();
					setLang(lang === "ru" ? "en" : "ru");
				}}
			>
				<span aria-hidden="true">{ui.langSwitch}</span>
			</button>
		</div>
	);
}
