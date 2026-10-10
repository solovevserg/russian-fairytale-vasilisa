import { heightAt } from "../scene/terrain";

export type Vec3 = [number, number, number];

/** Мусоргский, «Картинки с выставки»: см. scripts/prepare-audio.ts */
export const MUSIC_TRACKS = [
	"castle",
	"catacombs",
	"cum-mortuis",
	"hut",
] as const;
export type MusicTrack = (typeof MUSIC_TRACKS)[number];

export interface SceneKeyframe {
	/** id главы из chapters.ts */
	id: string;
	/** Время суток, часы 0..24. Время в истории всегда идёт вперёд. */
	timeOfDay: number;
	camera: {
		position: Vec3;
		target: Vec3;
		fov: number;
	};
	/** Сила ветра 0..1. */
	wind: number;
	/** Музыкальная тема главы и её громкость 0..1. */
	music: { track: MusicTrack; volume: number };
}

/** Точка на высоте `height` над землёй. */
function aboveGround(x: number, z: number, height: number): Vec3 {
	return [x, heightAt(x, z) + height, z];
}

/** Точка на тропинке в `distance` метрах от избушки (тропа уходит на +X+Z). */
function onPath(distance: number, height: number): Vec3 {
	return aboveGround(distance * 0.55, distance * 0.835, height);
}

const HUT: Vec3 = [0, 3.5, 0];

// Ключевые кадры по главам (см. docs/scenario.md).
// Избушка в центре поляны (радиус ~13 м), окно смотрит на +Z, тропа уходит на +X+Z.
export const KEYFRAMES: SceneKeyframe[] = [
	{
		id: "prologue",
		timeOfDay: 22,
		camera: { position: [26, 30, 34], target: [0, 2, 0], fov: 45 },
		wind: 0.6,
		music: { track: "castle", volume: 0.55 },
	},
	{
		id: "fire",
		timeOfDay: 3,
		camera: { position: onPath(30, 3.2), target: onPath(12, 2.5), fov: 55 },
		wind: 0.5,
		music: { track: "cum-mortuis", volume: 0.6 },
	},
	{
		id: "white-rider",
		timeOfDay: 5.6,
		camera: { position: onPath(22, 1.7), target: onPath(10, 3), fov: 55 },
		wind: 0.3,
		music: { track: "castle", volume: 0.5 },
	},
	{
		id: "red-rider",
		timeOfDay: 12,
		camera: { position: [-8, 12, 7], target: [6, 4, -6], fov: 55 },
		wind: 0.45,
		music: { track: "castle", volume: 0.55 },
	},
	{
		id: "clearing",
		timeOfDay: 18,
		camera: { position: onPath(14, 1.7), target: HUT, fov: 50 },
		wind: 0.35,
		music: { track: "catacombs", volume: 0.6 },
	},
	{
		id: "black-rider",
		timeOfDay: 20.5,
		camera: { position: [3.5, 0.6, 5.5], target: [0, 4.5, 0], fov: 62 },
		wind: 0.5,
		music: { track: "catacombs", volume: 0.7 },
	},
	{
		id: "baba-yaga",
		timeOfDay: 22,
		camera: { position: [6, 1.6, 7], target: [-3, 13, -6], fov: 62 },
		wind: 1,
		music: { track: "hut", volume: 0.85 },
	},
	{
		id: "tasks",
		timeOfDay: 23.5,
		camera: { position: [-8, 3, 5], target: HUT, fov: 50 },
		wind: 0.3,
		music: { track: "cum-mortuis", volume: 0.6 },
	},
	{
		id: "skull",
		timeOfDay: 3,
		camera: { position: onPath(5, 2.4), target: onPath(24, 1.8), fov: 55 },
		wind: 0.6,
		music: { track: "hut", volume: 0.75 },
	},
	{
		id: "epilogue",
		timeOfDay: 6.2,
		camera: { position: [-12, 38, 20], target: [0, 2, 0], fov: 45 },
		wind: 0.3,
		music: { track: "castle", volume: 0.6 },
	},
];
