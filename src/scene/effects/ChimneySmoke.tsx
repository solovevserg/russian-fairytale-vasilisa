import { Color } from "three";

import { currentSample } from "../../story/currentSample";
import { windUniforms } from "../forest/wind";
import { paletteAt } from "../sky/timeOfDay";
import { type ParticleUniforms, RisingParticles } from "./RisingParticles";

const DAY_SMOKE = new Color("#9a958c");
const NIGHT_SMOKE = new Color("#2e3038");

function updateSmoke(u: ParticleUniforms) {
	const night = paletteAt(currentSample.timeOfDay).night;
	u.uColor.value.copy(DAY_SMOKE).lerp(NIGHT_SMOKE, night);
	u.uOpacity.value = 0.45 - night * 0.15;
	// дым сносит ветром — по тому же направлению, что качает деревья
	const strength = 1.5 + currentSample.wind * 4;
	const dir = windUniforms.uWindDirection.value;
	u.uDrift.value.set(dir.x * strength, 0, dir.y * strength);
}

/** Дым из трубы избушки — идёт всегда, во всех главах. */
export function ChimneySmoke() {
	return (
		<RisingParticles
			count={48}
			life={7}
			rise={6}
			spread={0.35}
			size={0.9}
			grow={2.5}
			color="#9a958c"
			seed={7}
			update={updateSmoke}
		/>
	);
}
