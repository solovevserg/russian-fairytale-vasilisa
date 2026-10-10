import { autoReader } from "../reader/autoReader";
import { isSpeechSupported } from "../reader/narrator";
import { useReaderStore } from "../reader/readerStore";
import { SoundToggle } from "./SoundToggle";
import { useThemeStore } from "./theme";

/** Панель поверх сцены: чтение, озвучка, звук, тема. */
export function ControlBar() {
	const playing = useReaderStore((s) => s.playing);
	const narrate = useReaderStore((s) => s.narrate);
	const setNarrate = useReaderStore((s) => s.setNarrate);
	const theme = useThemeStore((s) => s.theme);
	const toggleTheme = useThemeStore((s) => s.toggle);
	const speech = isSpeechSupported();

	return (
		<div className="control-bar" role="toolbar" aria-label="Управление чтением">
			<button
				type="button"
				className="control-button control-button--primary"
				aria-pressed={playing}
				onClick={() => autoReader.toggle()}
			>
				<span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
				<span>{playing ? "Пауза" : "Читать сказку"}</span>
			</button>
			{speech && (
				<button
					type="button"
					className="control-button"
					aria-pressed={narrate}
					title="Читать вслух голосом браузера"
					onClick={() => setNarrate(!narrate)}
				>
					<span aria-hidden="true">🗣</span>
					<span>{narrate ? "Озвучка вкл." : "Озвучка"}</span>
				</button>
			)}
			<SoundToggle />
			<button
				type="button"
				className="control-button control-button--icon"
				aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
				title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
				onClick={toggleTheme}
			>
				<span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
			</button>
		</div>
	);
}
