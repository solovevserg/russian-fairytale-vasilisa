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
			<Credits />
		</main>
	);
}

const REPO = "https://github.com/solovevserg/russian-fairytale-vasilisa";

/** Источники и лицензии — CC-BY требует указывать авторов прямо на сайте. */
function Credits() {
	return (
		<footer className="story__credits">
			<p>
				Музыка — М. П. Мусоргский, «Картинки с выставки» (записи Musopen,
				общественное достояние). Звуки леса — OpenGameArt и BigSoundBank (CC0).
				Текстуры земли — Poly Haven (CC0). Деревья — ez-tree (MIT). Шрифты —
				Ruslan Display и Old Standard TT (OFL).
			</p>
			<p>
				3D-модели (CC BY 4.0, изменены: упрощены, сжаты, Василиса раскрашена):{" "}
				<a href="https://sketchfab.com/3d-models/a-hut-on-chicken-legs-b0117d56bb9b401f91442a1ce7f81329">
					«A hut on chicken legs»
				</a>{" "}
				— vet.doc,{" "}
				<a href="https://sketchfab.com/3d-models/witch-2a7672475d514543b618b5a82fd5582b">
					«Witch»
				</a>{" "}
				— MAXDESIGN,{" "}
				<a href="https://sketchfab.com/3d-models/red-slavic-folk-dress-dc0fbf4dc6db4f3da414c5738ad02255">
					«Red Slavic Folk Dress»
				</a>{" "}
				— akot777.
			</p>
			<p>
				<a href={`${REPO}/blob/master/docs/assets.md`}>
					Все источники и лицензии
				</a>
				{" · "}
				<a href={REPO}>Исходный код</a>
			</p>
		</footer>
	);
}
