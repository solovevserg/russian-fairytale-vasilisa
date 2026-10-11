import {CornerVine, MirroredField, Rosette} from "./motifs";

interface DropCapProps {
	letter: string;
	/** grand — тёмно-изумрудное поле (зачин сказки), chapter — светлое поле (главы) */
	variant: "grand" | "chapter";
}

/** id общих частей узора буквиц (DropCapDefs): побеги и розетки. */
const VINES_ID = "dropcap-vines";
const ROSETTES_ID = "dropcap-rosettes";

/**
 * Узор буквиц — побеги и розетки — описан один раз на страницу, буквицы
 * ссылаются на него (`<use>`): иначе каждая буквица несёт ~10 КБ одинаковой
 * разметки, а их по одной на главу (и в готовом HTML — на каждом языке).
 * Рисуется один раз, до первой буквицы.
 */
export function DropCapDefs() {
	return (
		<svg className="visually-hidden" aria-hidden="true" focusable="false">
			<defs>
				<g id={VINES_ID}>
					<MirroredField>
						<CornerVine />
					</MirroredField>
				</g>
				<g id={ROSETTES_ID}>
					{[
						[50, 4.5],
						[50, 95.5],
						[4.5, 50],
						[95.5, 50],
					].map(([cx, cy]) => (
						<Rosette key={`${cx}:${cy}`} cx={cx} cy={cy} r={5.5} />
					))}
				</g>
			</defs>
		</svg>
	);
}

/**
 * Буквица: буква Ruslan Display в квадратной рамке с симметричным растительным
 * узором. Только картинка — сама буква остаётся в тексте абзаца.
 */
export function DropCap({letter, variant}: DropCapProps) {
	const grand = variant === "grand";
	return (
		<svg
			className={`dropcap dropcap--${variant}`}
			viewBox="0 0 100 100"
			aria-hidden="true"
			focusable="false"
		>
			{/* поле и двойная рамка */}
			<rect
				x="1"
				y="1"
				width="98"
				height="98"
				rx="3"
				fill={grand ? "var(--orn-field)" : "var(--orn-light)"}
				stroke="var(--orn-gold)"
				strokeWidth={2}
			/>
			<rect
				x="4.5"
				y="4.5"
				width="91"
				height="91"
				rx="1.5"
				fill="none"
				stroke="var(--orn-red)"
				strokeWidth={1}
			/>
			<g opacity={grand ? 1 : 0.85}>
				<use href={`#${VINES_ID}`} />
			</g>
			<use href={`#${ROSETTES_ID}`} />
			<text
				x="50"
				y="76"
				className={`dropcap__letter dropcap__letter--${variant}`}
				textAnchor="middle"
				fontSize="66"
			>
				{letter}
			</text>
		</svg>
	);
}
