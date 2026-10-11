import {Suspense, useMemo} from "react";

import {VariantInstances} from "../forest/Forest";
import {useTreeVariants} from "../forest/useTreeVariants";
import {BUSH_SPECS} from "../forest/variants";
import type {TreePlacement} from "../forestLayout";
import {quality} from "../quality";
import {GrassField} from "./Grass";
import {bushDensity, grassDensity, scatter, tallGrassDensity} from "./layout";

const SHORT_TUFT = {
	blades: 7,
	height: 0.5,
	width: 0.05,
	spread: 0.3,
	seed: 11,
};
const TALL_TUFT = {
	blades: 9,
	height: 1.2,
	width: 0.045,
	spread: 0.35,
	seed: 23,
};
const SHORT_SCALE: [number, number] = [0.7, 1.3];
const TALL_SCALE: [number, number] = [0.75, 1.3];

/** На сколько угловых секторов делятся кусты (для отсечения вне кадра). */
const BUSH_SECTORS = 8;

function Bushes() {
	const variants = useTreeVariants(BUSH_SPECS, "bushes");
	const groups = useMemo(() => {
		const plants = scatter({
			seed: 3,
			radius: 42,
			spacing: 2.2,
			density: (x, z) => bushDensity(x, z) * quality.bushes,
			scale: [0.7, 1.25],
		});
		// по угловым секторам, как лес: иначе каждый InstancedMesh охватывает
		// всю поляну и не отсекается, даже когда кусты за спиной камеры
		const chunks = new Map<
			string,
			{variantIndex: number; placements: TreePlacement[]}
		>();
		plants.forEach((p, i) => {
			const variantIndex = i % variants.length;
			const angle = Math.atan2(p.z, p.x) + Math.PI;
			const sector = Math.min(
				Math.floor((angle / (Math.PI * 2)) * BUSH_SECTORS),
				BUSH_SECTORS - 1,
			);
			const key = `${variants[variantIndex].spec.id}-${sector}`;
			const chunk = chunks.get(key) ?? {variantIndex, placements: []};
			chunk.placements.push({...p, tilt: 0, variantIndex});
			chunks.set(key, chunk);
		});
		return [...chunks.entries()].map(([key, chunk]) => ({key, ...chunk}));
	}, [variants]);

	return (
		<group>
			{groups.map((chunk) => (
				<VariantInstances
					key={chunk.key}
					assets={variants[chunk.variantIndex]}
					placements={chunk.placements}
					castShadow={false}
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
				tipColor="#98a55c"
				rootColor="#3b4924"
			/>
			<GrassField
				seed={2}
				radius={40}
				spacing={0.55}
				density={tallGrassDensity}
				scale={TALL_SCALE}
				tuft={TALL_TUFT}
				tipColor="#a8a166"
				rootColor="#424f26"
			/>
			{/* кусты появятся, когда загрузится генератор деревьев */}
			<Suspense fallback={null}>
				<Bushes />
			</Suspense>
		</group>
	);
}
