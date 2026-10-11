import {useMemo} from "react";

import {chunkBySector, VariantInstances} from "../forest/Forest";
import {allReady, useTreeVariants} from "../forest/useTreeVariants";
import {BUSH_SPECS} from "../forest/variants";
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

/** Кусты — в очереди генерации после кромки леса, до его глубины (см. Forest). */
const bushPriority = () => 2;
const bushId = (variantIndex: number) => BUSH_SPECS[variantIndex].id;

/** Кусты у кромки леса — появляются разом, когда готовы все варианты. */
function Bushes() {
	const variants = useTreeVariants(BUSH_SPECS, bushPriority);
	const chunks = useMemo(() => {
		const plants = scatter({
			seed: 3,
			radius: 42,
			spacing: 2.2,
			density: (x, z) => bushDensity(x, z) * quality.bushes,
			scale: [0.7, 1.25],
		});
		const placements = plants.map((p, i) => ({
			...p,
			tilt: 0,
			variantIndex: i % BUSH_SPECS.length,
		}));
		return chunkBySector(placements, bushId);
	}, []);
	if (!allReady(variants)) return null;

	return (
		<group>
			{chunks.map((chunk) => (
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
			<Bushes />
		</group>
	);
}
