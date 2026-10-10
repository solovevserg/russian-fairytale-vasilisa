import { useEffect, useMemo } from "react";
import { createTreeVariant } from "../forest/createTreeVariant";
import { VariantInstances } from "../forest/Forest";
import type { TreeVariantSpec } from "../forest/variants";
import type { TreePlacement } from "../forestLayout";
import { GrassField } from "./Grass";
import { bushDensity, grassDensity, scatter, tallGrassDensity } from "./layout";

const SHORT_TUFT = {
	blades: 7,
	height: 0.3,
	width: 0.05,
	spread: 0.3,
	seed: 11,
};
const TALL_TUFT = {
	blades: 9,
	height: 0.95,
	width: 0.045,
	spread: 0.35,
	seed: 23,
};
const SHORT_SCALE: [number, number] = [0.7, 1.3];
const TALL_SCALE: [number, number] = [0.75, 1.3];

/** Кусты — пресеты ez-tree, с тем же ветром, что и деревья. */
const BUSH_SPECS: TreeVariantSpec[] = [
	{
		id: "bush-1",
		preset: "Bush 1",
		seed: 31,
		height: 1.6,
		weight: 1,
		zone: "edge",
		detail: 0.35,
		leafTint: 0x6f8a4e,
	},
	{
		id: "bush-2",
		preset: "Bush 2",
		seed: 32,
		height: 1.2,
		weight: 1,
		zone: "edge",
		detail: 0.35,
		leafTint: 0x7d8f50,
	},
	{
		id: "bush-3",
		preset: "Bush 3",
		seed: 33,
		height: 2.0,
		weight: 1,
		zone: "edge",
		detail: 0.35,
		leafTint: 0x5f7a48,
	},
];

function Bushes() {
	const variants = useMemo(() => BUSH_SPECS.map(createTreeVariant), []);
	const groups = useMemo(() => {
		const plants = scatter({
			seed: 3,
			radius: 35,
			spacing: 3.2,
			density: bushDensity,
			scale: [0.7, 1.25],
		});
		const byVariant = variants.map(() => [] as TreePlacement[]);
		plants.forEach((p, i) => {
			const variantIndex = i % variants.length;
			byVariant[variantIndex].push({ ...p, tilt: 0, variantIndex });
		});
		return byVariant;
	}, [variants]);

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

	return (
		<group>
			{variants.map((assets, i) => (
				<VariantInstances
					key={assets.spec.id}
					assets={assets}
					placements={groups[i]}
				/>
			))}
		</group>
	);
}

/** Низкая трава повсюду, высокая — пятнами, кусты — у кромки леса. */
export function Vegetation() {
	return (
		<group>
			<GrassField
				seed={1}
				radius={34}
				spacing={0.38}
				density={grassDensity}
				scale={SHORT_SCALE}
				tuft={SHORT_TUFT}
				tipColor="#c2cc82"
				rootColor="#5d6e3c"
			/>
			<GrassField
				seed={2}
				radius={40}
				spacing={0.55}
				density={tallGrassDensity}
				scale={TALL_SCALE}
				tuft={TALL_TUFT}
				tipColor="#cdc489"
				rootColor="#5e6a3a"
			/>
			<Bushes />
		</group>
	);
}
