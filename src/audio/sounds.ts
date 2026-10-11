import type {MusicTrack} from "../story/keyframes";

export const LOOPS = ["amb-forest-day", "amb-crickets", "amb-wind"] as const;
export type LoopId = (typeof LOOPS)[number];

export const SFX = [
	"sfx-owl",
	"sfx-tree-creak",
	"sfx-crack-1",
	"sfx-crack-2",
	"sfx-crack-3",
	"sfx-crack-4",
	"sfx-hut-creak-1",
	"sfx-hut-creak-2",
] as const;
export type SfxId = (typeof SFX)[number];

export function musicFile(track: MusicTrack): string {
	return `music-${track}`;
}

let extension: "webm" | "mp3" | undefined;

/** Opus/WebM, если браузер умеет, иначе MP3 (см. scripts/prepare-audio.ts). */
export function audioUrl(name: string): string {
	if (!extension) {
		const probe = document.createElement("audio");
		extension = probe.canPlayType('audio/webm; codecs="opus"') ? "webm" : "mp3";
	}
	return `${import.meta.env.BASE_URL}audio/${name}.${extension}`;
}

export function fallbackUrl(name: string): string {
	return `${import.meta.env.BASE_URL}audio/${name}.mp3`;
}
