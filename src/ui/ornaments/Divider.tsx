import { Berry, Leaf, Rosette } from "./motifs";

/** Половина узора разделителя (левая), правая — зеркальная копия. */
function HalfVine() {
	return (
		<g>
			<g fill="none" stroke="var(--orn-gold)" strokeLinecap="round">
				<path
					d="M136 20 C118 20 112 7 96 10 C84 12 83 27 93 27 C100 27 101 19 95 18.5"
					strokeWidth={1.8}
				/>
				<path
					d="M96 10 C80 6 64 22 44 20 C34 19 24 14 14 20"
					strokeWidth={1.3}
				/>
				<path
					d="M14 20 C9 23 9 29 14 29 C17 29 18 26 16 24.5"
					strokeWidth={1.1}
				/>
			</g>
			<Leaf x={116} y={15} angle={-160} length={11} />
			<Leaf x={70} y={14} angle={-200} length={10} />
			<Leaf x={56} y={21} angle={20} length={9} />
			<Leaf x={30} y={17} angle={-170} length={8} />
			<Berry x={108} y={24} r={2.4} />
			<Berry x={44} y={14} r={1.8} />
		</g>
	);
}

/**
 * Орнаментальный разделитель: розетка в центре и симметричные побеги.
 * `large` — для заставки над названием сказки.
 */
export function Divider({ large = false }: { large?: boolean }) {
	return (
		<svg
			className={large ? "divider divider--large" : "divider"}
			viewBox="0 0 300 40"
			aria-hidden="true"
			focusable="false"
		>
			<HalfVine />
			<g transform="translate(300 0) scale(-1 1)">
				<HalfVine />
			</g>
			<Rosette cx={150} cy={20} r={11} />
		</svg>
	);
}

/** Концовка в конце сказки: узкий треугольник-«свиток» из побегов. */
export function Tailpiece() {
	return (
		<svg
			className="tailpiece"
			viewBox="0 0 120 70"
			aria-hidden="true"
			focusable="false"
		>
			<g
				fill="none"
				stroke="var(--orn-gold)"
				strokeLinecap="round"
				strokeWidth={1.6}
			>
				<path d="M10 8 C40 10 50 30 60 62 C70 30 80 10 110 8" />
				<path d="M28 9 C26 18 34 22 38 17" />
				<path d="M92 9 C94 18 86 22 82 17" />
			</g>
			<Leaf x={44} y={28} angle={-120} length={10} />
			<Leaf x={76} y={28} angle={-60} length={10} />
			<Berry x={60} y={52} r={3} />
			<Rosette cx={60} cy={12} r={8} petals={6} />
		</svg>
	);
}
