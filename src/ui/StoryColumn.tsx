import { chapters } from "../story/chapters";

export function StoryColumn() {
	return (
		<main className="story">
			<header className="story__header">
				<h1>Василиса Прекрасная</h1>
				<p className="story__subtitle">Русская народная сказка</p>
			</header>
			{chapters.map((chapter) => (
				<section
					key={chapter.id}
					className="chapter"
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
