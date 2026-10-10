import type { ForestZone } from "./forest/variants";
import { createRandom } from "./random";
import { CLEARING_RADIUS, forestDensity, heightAt } from "./terrain";

export interface TreePlacement {
	x: number;
	y: number;
	z: number;
	scale: number;
	rotation: number;
	/** Небольшой наклон ствола — живой лес не растёт по линейке. */
	tilt: number;
	variantIndex: number;
}

export interface VariantWeight {
	zone: ForestZone;
	weight: number;
}

export interface ForestLayoutOptions {
	seed: number;
	variants: VariantWeight[];
	outerRadius: number;
	/** Ширина кольца у поляны, где растут «детальные» деревья. */
	edgeWidth: number;
	/** Минимальное расстояние между стволами. */
	minDistance: number;
	maxTrees: Record<ForestZone, number>;
}

function pickVariant(
	variants: VariantWeight[],
	zone: ForestZone,
	roll: number,
): number {
	const candidates = variants
		.map((v, index) => ({ ...v, index }))
		.filter((v) => v.zone === zone);
	const total = candidates.reduce((sum, v) => sum + v.weight, 0);
	let acc = 0;
	for (const v of candidates) {
		acc += v.weight / total;
		if (roll <= acc) return v.index;
	}
	return candidates[candidates.length - 1].index;
}

/**
 * Расставляет деревья кольцом вокруг поляны: случайные точки с отбраковкой
 * по минимальной дистанции (dart throwing) и по карте плотности леса.
 */
export function layoutForest({
	seed,
	variants,
	outerRadius,
	edgeWidth,
	minDistance,
	maxTrees,
}: ForestLayoutOptions): TreePlacement[] {
	const random = createRandom(seed);
	const trees: TreePlacement[] = [];
	const minDistanceSq = minDistance * minDistance;
	const counts: Record<ForestZone, number> = { edge: 0, deep: 0 };
	const attempts = (maxTrees.edge + maxTrees.deep) * 40;

	for (let i = 0; i < attempts; i++) {
		const x = (random() * 2 - 1) * outerRadius;
		const z = (random() * 2 - 1) * outerRadius;
		const r = Math.hypot(x, z);
		if (r > outerRadius || r < CLEARING_RADIUS) continue;
		if (random() > forestDensity(x, z)) continue;
		const zone: ForestZone = r < CLEARING_RADIUS + edgeWidth ? "edge" : "deep";
		if (counts[zone] >= maxTrees[zone]) continue;
		if (trees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < minDistanceSq))
			continue;

		counts[zone]++;
		trees.push({
			x,
			y: heightAt(x, z) - 0.15,
			z,
			scale: 0.75 + random() * 0.5,
			rotation: random() * Math.PI * 2,
			tilt: (random() - 0.5) * 0.08,
			variantIndex: pickVariant(variants, zone, random()),
		});
	}
	return trees;
}
