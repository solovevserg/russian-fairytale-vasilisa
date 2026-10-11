import { useRef } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { type Content, useContent } from "../i18n/content";
import { useReaderStore } from "../reader/readerStore";
import { useStoryStore } from "../state/storyStore";
import type { Chapter } from "../story/chapters";
import { ChapterNav, useChapterHash } from "./ChapterNav";
import { Divider, Tailpiece } from "./ornaments/Divider";
import { DropCap } from "./ornaments/DropCap";

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

const ROMAN: [number, string][] = [
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

function toRoman(n: number): string {
	let out = "";
	for (const [value, digits] of ROMAN) {
		while (n >= value) {
			out += digits;
			n -= value;
		}
	}
	return out;
}

function ChapterSection({
	chapter,
	caption,
	index,
	last,
	active,
	speaking,
}: {
	chapter: Chapter;
	caption: string;
	index: number;
	last: boolean;
	active: boolean;
	/** Абзац, который сейчас читается вслух, или null. */
	speaking: number | null;
}) {
	const [first, ...rest] = chapter.paragraphs;
	const numeral = index > 0 && !last ? toRoman(index) : null;
	return (
		<section
			className={active ? "chapter chapter--active" : "chapter"}
			aria-current={active ? "step" : undefined}
			id={chapter.id}
			data-keyframe={chapter.id}
		>
			{index > 0 && <Divider />}
			<p className="chapter__caption">{caption}</p>
			<h2>
				{/* на мобильных вместо подписи «Глава …» — римская цифра перед названием */}
				{numeral && (
					<span className="chapter__numeral" aria-hidden="true">
						{numeral}.{" "}
					</span>
				)}
				{chapter.title}
			</h2>
			<div className="chapter__body">
				{first && (
					<OpeningParagraph
						text={first}
						grand={index === 0}
						reading={speaking === 0}
					/>
				)}
				{rest.map((text, i) => (
					<p
						key={text}
						className={speaking === i + 1 ? "is-reading" : undefined}
					>
						{text}
					</p>
				))}
			</div>
			{last && <Tailpiece />}
		</section>
	);
}

export function StoryColumn() {
	const root = useRef<HTMLElement>(null);
	useScrollProgress(root);
	useChapterHash();
	const content = useContent();
	const activeChapter = useStoryStore((s) => s.activeChapter);
	const speaking = useReaderStore((s) => s.speaking);
	const chapters = content.chapters;

	return (
		<main className="story" ref={root}>
			<header className="story__header" id="start">
				<Divider large />
				<p className="story__kicker">{content.subtitle}</p>
				<h1>{content.title}</h1>
				<p className="story__subtitle">{content.source}</p>
				<Divider large />
			</header>
			{chapters.map((chapter, i) => (
				<ChapterSection
					key={chapter.id}
					chapter={chapter}
					caption={content.caption(i)}
					index={i}
					last={i === chapters.length - 1}
					active={i === activeChapter}
					speaking={speaking?.[0] === i ? speaking[1] : null}
				/>
			))}
			<Credits content={content} />
			<ChapterNav
				labels={{
					nav: content.ui.chaptersNav,
					prev: content.ui.prevChapter,
					next: content.ui.nextChapter,
				}}
			/>
		</main>
	);
}

const REPO = "https://github.com/solovevserg/russian-fairytale-vasilisa";
const AUTHOR_URL = "https://sergsol.dev";
const MODELS = [
	[
		"https://sketchfab.com/3d-models/a-hut-on-chicken-legs-b0117d56bb9b401f91442a1ce7f81329",
		"A hut on chicken legs",
		"vet.doc",
		"CC BY 4.0",
	],
	[
		"https://sketchfab.com/3d-models/witch-2a7672475d514543b618b5a82fd5582b",
		"Witch",
		"MAXDESIGN",
		"CC BY 4.0",
	],
	[
		"https://sketchfab.com/3d-models/red-slavic-folk-dress-dc0fbf4dc6db4f3da414c5738ad02255",
		"Red Slavic Folk Dress",
		"akot777",
		"CC BY 4.0",
	],
	["https://poly.pizza/m/5xli1AZx7tL", "Cabin", "Poly by Google", "CC BY 3.0"],
] as const;

/** Источники и лицензии — CC-BY требует указывать авторов прямо на сайте. */
function Credits({ content }: { content: Content }) {
	const c = content.ui.credits;
	return (
		<footer className="story__credits" id="credits">
			{/* сначала — кто сделал: надзаголовок и имя; ниже — источники */}
			<p className="story__credits-role">{c.authorRole}</p>
			<h2 className="story__credits-name">
				<a href={AUTHOR_URL}>{c.authorName}</a>
			</h2>
			<p className="story__credits-dedication">{c.dedication}</p>
			<p className="story__credits-with">
				{c.withClaude[0]}
				<a href="https://claude.ai">Claude</a>
				{c.withClaude[1]}
			</p>
			<p>{c.music}</p>
			<p>
				{c.models}{" "}
				{MODELS.map(([url, title, author, license], i) => (
					<span key={url}>
						<a href={url}>«{title}»</a> — {author} ({license})
						{i < MODELS.length - 1 ? ", " : "."}
					</span>
				))}
			</p>
			<p>
				<a href={`${REPO}/blob/master/docs/assets.md`}>{c.allSources}</a>
				{" · "}
				<a href={REPO}>{c.sourceCode}</a>
			</p>
		</footer>
	);
}
