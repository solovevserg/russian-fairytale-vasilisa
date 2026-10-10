import { SceneCanvas } from "./scene/SceneCanvas";
import { ControlBar } from "./ui/ControlBar";
import { StoryColumn } from "./ui/StoryColumn";

export function App() {
	return (
		<div className="layout">
			<div className="scene" aria-hidden="true">
				<SceneCanvas />
			</div>
			<ControlBar />
			<StoryColumn />
		</div>
	);
}
