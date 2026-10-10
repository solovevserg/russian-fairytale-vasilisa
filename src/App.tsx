import { SceneCanvas } from "./scene/SceneCanvas";
import { SoundToggle } from "./ui/SoundToggle";
import { StoryColumn } from "./ui/StoryColumn";

export function App() {
	return (
		<div className="layout">
			<div className="scene" aria-hidden="true">
				<SceneCanvas />
			</div>
			<SoundToggle />
			<StoryColumn />
		</div>
	);
}
