/**
 * Общие элементы орнамента в духе Билибина: побег с завитками, листья, ягоды,
 * розетка. Координаты — в системе SVG того компонента, куда вставляются.
 */

/** Розетка: восемь лепестков вокруг сердцевины. */
export function Rosette({
	cx,
	cy,
	r,
	petals = 8,
}: {
	cx: number;
	cy: number;
	r: number;
	petals?: number;
}) {
	return (
		<g>
			{Array.from({ length: petals }, (_, i) => (
				<ellipse
					// biome-ignore lint/suspicious/noArrayIndexKey: лепестки статичны
					key={i}
					cx={cx}
					cy={cy - r * 0.55}
					rx={r * 0.22}
					ry={r * 0.5}
					fill="var(--orn-gold)"
					transform={`rotate(${(360 / petals) * i} ${cx} ${cy})`}
				/>
			))}
			<circle cx={cx} cy={cy} r={r * 0.32} fill="var(--orn-red)" />
			<circle cx={cx} cy={cy} r={r * 0.13} fill="var(--orn-gold)" />
		</g>
	);
}

/** Лист-миндалина от точки (x, y) под углом `angle` градусов. */
export function Leaf({
	x,
	y,
	angle,
	length,
	fill = "var(--orn-green)",
}: {
	x: number;
	y: number;
	angle: number;
	length: number;
	fill?: string;
}) {
	const w = length * 0.42;
	return (
		<path
			d={`M0 0 Q${length * 0.5} ${-w} ${length} 0 Q${length * 0.5} ${w} 0 0Z`}
			fill={fill}
			transform={`translate(${x} ${y}) rotate(${angle})`}
		/>
	);
}

export function Berry({ x, y, r }: { x: number; y: number; r: number }) {
	return (
		<g>
			<circle cx={x} cy={y} r={r} fill="var(--orn-red)" />
			<circle
				cx={x - r * 0.3}
				cy={y - r * 0.3}
				r={r * 0.3}
				fill="var(--orn-light)"
				opacity={0.7}
			/>
		</g>
	);
}

/**
 * Четверть узора для квадратной рамки 100×100: побег из угла,
 * два завитка, листья и ягоды. Остальные четверти — зеркальные копии.
 */
export function CornerVine() {
	return (
		<g>
			<g fill="none" stroke="var(--orn-gold)" strokeLinecap="round">
				<path d="M7 43 C7 22 22 7 43 7" strokeWidth={2.2} />
				<path
					d="M11 33 C7 25 12 16 19 18 C25 19 25 26 20 27 C17 27.5 16 24 18 23"
					strokeWidth={1.6}
				/>
				<path d="M33 11 C25 7 16 12 18 19" strokeWidth={1.6} />
				<path d="M24 9 C27 15 33 17 38 15" strokeWidth={1.2} />
			</g>
			<Leaf x={8} y={40} angle={-62} length={11} />
			<Leaf x={40} y={8} angle={-28} length={11} />
			<Leaf x={13} y={14} angle={-135} length={7} />
			<Berry x={27} y={27} r={2.8} />
			<Berry x={38} y={20} r={1.8} />
			<Berry x={20} y={38} r={1.8} />
		</g>
	);
}

/** Четыре зеркальных четверти: узор на всё поле 100×100. */
export function MirroredField({ children }: { children: React.ReactNode }) {
	return (
		<g>
			<g>{children}</g>
			<g transform="translate(100 0) scale(-1 1)">{children}</g>
			<g transform="translate(0 100) scale(1 -1)">{children}</g>
			<g transform="translate(100 100) scale(-1 -1)">{children}</g>
		</g>
	);
}
