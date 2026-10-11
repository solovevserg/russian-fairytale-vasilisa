import { createRandom } from "../lib/random";
import type { ForestZone } from "./forest/variants";
import { CLEARING_RADIUS, forestDensity, HOME, heightAt } from "./terrain";

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

/**
 * Деревья за избой Василисы: [вариант, м за избой, м вбок, масштаб] — чтобы
 * в эпилоге за домом был не голый склон, а пара деревьев.
 */
const HOME_TREES: [string, number, number, number][] = [
	["oak-old", 10.5, -5.5, 1.05],
	["aspen", 12, 1.5, 0.95],
	["pine-edge-a", 10, 7, 1.1],
];

/** Деревья у избы Василисы (ids вариантов — из списка `variants`). */
export function layoutHomeTrees(
	variants: { spec: { id: string } }[],
): TreePlacement[] {
	// фасад смотрит на тропу (HOME.heading) — «за избой» значит от тропы
	const backX = -Math.sin(HOME.heading);
	const backZ = -Math.cos(HOME.heading);
	return HOME_TREES.flatMap(([id, back, side, scale], i) => {
		const variantIndex = variants.findIndex((v) => v.spec.id === id);
		if (variantIndex < 0) return [];
		const x = HOME.x + backX * back - backZ * side;
		const z = HOME.z + backZ * back + backX * side;
		return [
			{
				x,
				y: heightAt(x, z) - 0.15,
				z,
				scale,
				rotation: i * 2.1,
				tilt: 0,
				variantIndex,
			},
		];
	});
}
