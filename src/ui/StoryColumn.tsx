import { useRef } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useReaderStore } from "../reader/readerStore";
import { useStoryStore } from "../state/storyStore";
import { type Chapter, chapters } from "../story/chapters";
import { Divider, Tailpiece } from "./ornaments/Divider";
import { DropCap } from "./ornaments/DropCap";

const ORDINALS = [
	"первая",
	"вторая",
	"третья",
	"четвёртая",
	"пятая",
	"шестая",
	"седьмая",
	"восьмая",
	"девятая",
	"десятая",
];

/** Подпись над названием главы: «Зачин», «Глава первая»…, «Концовка». */
function chapterCaption(index: number): string {
	if (index === 0) return "Зачин";
	if (index === chapters.length - 1) return "Концовка";
	return `Глава ${ORDINALS[index - 1] ?? index}`;
}

/** Первый абзац главы с буквицей; буква остаётся в тексте для скринридеров и поиска. */
function OpeningParagraph({
	text,
	grand,
	reading,
}: {
	text: string;
	grand: boolean;
	reading: boolean;
}) {
	const letter = text.charAt(0);
	return (
		<p className={reading ? "has-dropcap is-reading" : "has-dropcap"}>
			<DropCap letter={letter} variant={grand ? "grand" : "chapter"} />
			<span className="visually-hidden">{letter}</span>
			{text.slice(1)}
		</p>
	);
}

function ChapterSection({
	chapter,
	index,
	active,
	speaking,
}: {
	chapter: Chapter;
	index: number;
	active: boolean;
	/** Абзац, который сейчас читается вслух, или null. */
	speaking: number | null;
}) {
	const [first, ...rest] = chapter.paragraphs;
	return (
		<section
			className={active ? "chapter chapter--active" : "chapter"}
			aria-current={active ? "step" : undefined}
			data-keyframe={chapter.id}
		>
			{index > 0 && <Divider />}
			<p className="chapter__caption">{chapterCaption(index)}</p>
			<h2>{chapter.title}</h2>
			{first && (
				<OpeningParagraph
					text={first}
					grand={index === 0}
					reading={speaking === 0}
				/>
			)}
			{rest.map((text, i) => (
				<p key={text} className={speaking === i + 1 ? "is-reading" : undefined}>
					{text}
				</p>
			))}
			{index === chapters.length - 1 && <Tailpiece />}
		</section>
	);
}

export function StoryColumn() {
	const root = useRef<HTMLElement>(null);
	useScrollProgress(root);
	const activeChapter = useStoryStore((s) => s.activeChapter);
	const speaking = useReaderStore((s) => s.speaking);

	return (
		<main className="story" ref={root}>
			<header className="story__header">
				<Divider large />
				<p className="story__kicker">Русская народная сказка</p>
				<h1>Василиса Прекрасная</h1>
				<p className="story__subtitle">по мотивам собрания А. Н. Афанасьева</p>
				<Divider large />
			</header>
			{chapters.map((chapter, i) => (
				<ChapterSection
					key={chapter.id}
					chapter={chapter}
					index={i}
					active={i === activeChapter}
					speaking={speaking?.[0] === i ? speaking[1] : null}
				/>
			))}
		</main>
	);
}
