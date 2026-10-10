import { createRandom } from "./random";

export interface TreePlacement {
	x: number;
	z: number;
	scale: number;
	rotation: number;
}

export interface ForestLayoutOptions {
	seed: number;
	count: number;
	/** Радиус свободной поляны в центре. */
	clearingRadius: number;
	/** Внешний радиус леса. */
	outerRadius: number;
}

/** Расставляет деревья кольцом вокруг поляны. Пока — случайно, позже — Poisson disk. */
export function layoutForest({
	seed,
	count,
	clearingRadius,
	outerRadius,
}: ForestLayoutOptions): TreePlacement[] {
	const random = createRandom(seed);
	const trees: TreePlacement[] = [];
	for (let i = 0; i < count; i++) {
		const angle = random() * Math.PI * 2;
		// sqrt — равномерная плотность по площади кольца
		const t = Math.sqrt(random());
		const radius = clearingRadius + t * (outerRadius - clearingRadius);
		trees.push({
			x: Math.cos(angle) * radius,
			z: Math.sin(angle) * radius,
			scale: 0.7 + random() * 0.8,
			rotation: random() * Math.PI * 2,
		});
	}
	return trees;
}
