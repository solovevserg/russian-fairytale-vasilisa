import {useFrame} from "@react-three/fiber";
import {Vector3} from "three";

import {paletteAt} from "../scene/sky/timeOfDay";
import {currentSample} from "../story/currentSample";
import {HUT_BODY} from "../story/places";
import {type AudioMix, audioEngine} from "./AudioEngine";

const mix: AudioMix = {
	music: currentSample.music,
	night: 0,
	wind: 0,
	hut: new Vector3(...HUT_BODY),
};

/** Передаёт звуковому движку состояние истории и положение камеры. */
export function AudioDirector() {
	useFrame(({camera}) => {
		if (!audioEngine.isRunning) return;
		mix.night = paletteAt(currentSample.timeOfDay).night;
		mix.wind = currentSample.wind;
		audioEngine.update(mix, camera);
	});
	return null;
}
