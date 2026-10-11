import {useAfterFirstPaint} from "./lib/hooks/useAfterFirstPaint";
import {SceneCanvas} from "./scene/SceneCanvas";
import {BackToStart} from "./ui/BackToStart";
import {ControlBar} from "./ui/ControlBar";
import {StoryColumn} from "./ui/StoryColumn";
import {SwipeHint} from "./ui/SwipeHint";

export function App() {
	// сцена — после первой отрисовки: текст сказки не ждёт 3D (модели и
	// текстуры при этом уже грузятся — их предзагрузка стартует при импорте)
	const showScene = useAfterFirstPaint();
	return (
		<div className="layout">
			<div className="scene" aria-hidden="true">
				{showScene && <SceneCanvas />}
			</div>
			<ControlBar />
			<StoryColumn />
			<SwipeHint />
			<BackToStart />
		</div>
	);
}
