import { SceneCanvas } from "./scene/SceneCanvas";
import { ControlBar } from "./ui/ControlBar";
import { StoryColumn } from "./ui/StoryColumn";
import { SwipeHint } from "./ui/SwipeHint";

export function App() {
	return (
		<div className="layout">
			<div className="scene" aria-hidden="true">
				<SceneCanvas />
			</div>
			<ControlBar />
			<StoryColumn />
			<SwipeHint />
		</div>
	);
}
