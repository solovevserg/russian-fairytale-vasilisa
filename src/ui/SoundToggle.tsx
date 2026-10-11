import { audioEngine } from "../audio/AudioEngine";
import { useAudioStore } from "../audio/audioStore";
import { useContent } from "../i18n/content";

export function SoundToggle() {
	const enabled = useAudioStore((s) => s.enabled);
	const preferred = useAudioStore((s) => s.preferred);
	const setEnabled = useAudioStore((s) => s.setEnabled);
	const ui = useContent().ui;

	const toggle = () => {
		// звук запускается прямо в обработчике клика — иначе браузер его заблокирует
		if (enabled) audioEngine.stop();
		else audioEngine.start();
		setEnabled(!enabled);
	};

	return (
		<button
			type="button"
			className={`control-button sound-toggle${!enabled && preferred ? " sound-toggle--hint" : ""}`}
			aria-pressed={enabled}
			aria-label={enabled ? ui.soundDisable : ui.soundEnable}
			onClick={toggle}
		>
			<span aria-hidden="true">{enabled ? "🔊" : "🔇"}</span>
			<span className="control-button__label">
				{enabled ? ui.soundOn : ui.soundOff}
			</span>
		</button>
	);
}
