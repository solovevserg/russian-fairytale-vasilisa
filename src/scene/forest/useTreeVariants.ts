import {use, useEffect, useMemo} from "react";

import type {TreeVariantAssets} from "./createTreeVariant";
import type {TreeVariantSpec} from "./variants";

/**
 * Генератор деревьев грузится отдельным чанком (ez-tree и его текстуры коры
 * и листвы): сцена — небо, земля, избы, трава, герои — рисуется и без него.
 * Загрузка начинается при первом лесе или кустах на сцене (с ?noforest
 * и ?nograss — не начинается вовсе).
 */
let treeFactory: Promise<typeof import("./createTreeVariant")> | undefined;
function loadTreeFactory() {
	treeFactory ??= import("./createTreeVariant");
	return treeFactory;
}

/**
 * Генерирует варианты деревьев (или кустов) по спецификациям; пока генератор
 * не загружен — приостанавливает компонент (нужен `<Suspense>` выше).
 * Геометрия и материалы освобождаются при размонтировании.
 *
 * @param specs — спецификации вариантов; должны быть стабильны между рендерами
 * (константа модуля), иначе деревья будут генерироваться заново.
 * @param label — подпись для замера времени генерации в dev-сборке.
 */
export function useTreeVariants(
	specs: readonly TreeVariantSpec[],
	label: string,
): TreeVariantAssets[] {
	const {createTreeVariant} = use(loadTreeFactory());
	const variants = useMemo(() => {
		const started = performance.now();
		const result = specs.map(createTreeVariant);
		if (import.meta.env.DEV) {
			console.info(
				`[${label}] ${result.length} вариантов за ${Math.round(performance.now() - started)} мс`,
				JSON.stringify(
					Object.fromEntries(
						result.map((v) => [v.spec.id, Math.round(v.triangles)]),
					),
				),
			);
		}
		return result;
	}, [specs, createTreeVariant, label]);

	useEffect(
		() => () => {
			for (const v of variants) {
				for (const part of [v.branches, v.leaves]) {
					part.geometry.dispose();
					part.material.dispose();
					part.depthMaterial.dispose();
				}
			}
		},
		[variants],
	);

	return variants;
}
