import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { paletteAt } from "../scene/sky/timeOfDay";
import { heightAt } from "../scene/terrain";
import { currentSample } from "../story/currentSample";
import { type AudioMix, audioEngine } from "./AudioEngine";

const mix: AudioMix = {
	music: currentSample.music,
	night: 0,
	wind: 0,
	hut: new Vector3(0, heightAt(0, 0) + 4.5, 0),
};

/** Передаёт звуковому движку состояние истории и положение камеры. */
export function AudioDirector() {
	useFrame(({ camera }) => {
		if (!audioEngine.isRunning) return;
		mix.night = paletteAt(currentSample.timeOfDay).night;
		mix.wind = currentSample.wind;
		audioEngine.update(mix, camera);
	});
	return null;
}
