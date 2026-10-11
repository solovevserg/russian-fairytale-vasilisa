import { useEffect, useState } from "react";
import { useContent } from "../i18n/content";
import { useLangStore } from "../i18n/lang";
import { autoReader } from "../reader/autoReader";
import { hasVoiceFor } from "../reader/narrator";
import { useReaderStore } from "../reader/readerStore";
import { LangMenu } from "./LangMenu";
import { SoundToggle } from "./SoundToggle";
import { useThemeStore } from "./theme";

/** Есть ли голос для языка (голоса грузятся асинхронно — до ответа кнопки нет). */
function useVoiceAvailable(lang: string): boolean {
	const [available, setAvailable] = useState(false);
	useEffect(() => {
		let alive = true;
		hasVoiceFor(lang).then((ok) => {
			if (alive) setAvailable(ok);
		});
		return () => {
			alive = false;
		};
	}, [lang]);
	return available;
}

/** Панель поверх сцены: чтение, озвучка, звук, тема, язык. */
export function ControlBar() {
	const playing = useReaderStore((s) => s.playing);
	const narrate = useReaderStore((s) => s.narrate);
	const setNarrate = useReaderStore((s) => s.setNarrate);
	const theme = useThemeStore((s) => s.theme);
	const toggleTheme = useThemeStore((s) => s.toggle);
	const lang = useLangStore((s) => s.lang);
	const content = useContent();
	const ui = content.ui;
	const speech = useVoiceAvailable(content.speechLang);

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
				{playing ? (
					<span>{ui.pause}</span>
				) : (
					<>
						<span className="control-button__full">{ui.read}</span>
						{/* на мобильных — короче, чтобы панель влезла в одну строку */}
						<span className="control-button__short" aria-hidden="true">
							{ui.readShort}
						</span>
					</>
				)}
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
			<LangMenu />
		</div>
	);
}
