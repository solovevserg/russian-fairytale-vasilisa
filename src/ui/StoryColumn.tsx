import { useRef } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useStoryStore } from "../state/storyStore";
import { chapters } from "../story/chapters";

export function StoryColumn() {
	const root = useRef<HTMLElement>(null);
	useScrollProgress(root);
	const activeChapter = useStoryStore((s) => s.activeChapter);

	return (
		<main className="story" ref={root}>
			<header className="story__header">
				<h1>Василиса Прекрасная</h1>
				<p className="story__subtitle">Русская народная сказка</p>
			</header>
			{chapters.map((chapter, i) => (
				<section
					key={chapter.id}
					className={
						i === activeChapter ? "chapter chapter--active" : "chapter"
					}
					aria-current={i === activeChapter ? "step" : undefined}
					data-keyframe={chapter.id}
				>
					<h2>{chapter.title}</h2>
					{chapter.paragraphs.map((text) => (
						<p key={text}>{text}</p>
					))}
				</section>
			))}
		</main>
	);
}
