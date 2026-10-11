import {useEffect, useState} from "react";

import type {TreeVariantAssets} from "./createTreeVariant";
import {generateTree} from "./treeQueue";
import type {TreeVariantSpec} from "./variants";

/**
 * Варианты деревьев (или кустов) по спецификациям — по мере готовности:
 * элемент массива `undefined`, пока очередь (treeQueue.ts) до него не дошла.
 *
 * @param specs — спецификации вариантов; должны быть стабильны между рендерами
 * (константа модуля).
 * @param priority — очерёдность варианта: меньше — раньше.
 */
export function useTreeVariants(
	specs: readonly TreeVariantSpec[],
	priority: (spec: TreeVariantSpec) => number,
): (TreeVariantAssets | undefined)[] {
	const [variants, setVariants] = useState<(TreeVariantAssets | undefined)[]>(
		() => specs.map(() => undefined),
	);

	useEffect(() => {
		let alive = true;
		specs.forEach((spec, i) => {
			generateTree(spec, priority(spec)).then(
				(assets) => {
					if (!alive) return;
					setVariants((current) =>
						current.map((v, j) => (j === i ? assets : v)),
					);
				},
				(error) => console.error(`[trees] ${spec.id}:`, error),
			);
		});
		return () => {
			alive = false;
		};
	}, [specs, priority]);

	return variants;
}

/** Готовы ли все варианты. */
export function allReady(
	variants: (TreeVariantAssets | undefined)[],
): variants is TreeVariantAssets[] {
	return variants.every((v) => v !== undefined);
}
