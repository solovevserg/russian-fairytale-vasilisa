import { audioEngine } from "../audio/AudioEngine";
import { useAudioStore } from "../audio/audioStore";

export function SoundToggle() {
	const enabled = useAudioStore((s) => s.enabled);
	const preferred = useAudioStore((s) => s.preferred);
	const setEnabled = useAudioStore((s) => s.setEnabled);

	const toggle = () => {
		// звук запускается прямо в обработчике клика — иначе браузер его заблокирует
		if (enabled) audioEngine.stop();
		else audioEngine.start();
		setEnabled(!enabled);
	};

	return (
		<button
			type="button"
			className={`sound-toggle${!enabled && preferred ? " sound-toggle--hint" : ""}`}
			aria-pressed={enabled}
			aria-label={enabled ? "Выключить звук" : "Включить звук"}
			onClick={toggle}
		>
			<span aria-hidden="true">{enabled ? "🔊" : "🔇"}</span>
			<span className="sound-toggle__label">
				{enabled ? "Звук включён" : "Включить звук"}
			</span>
		</button>
	);
}
