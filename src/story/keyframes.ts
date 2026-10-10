import { heightAt, pathFrame } from "../scene/terrain";

export type Vec3 = [number, number, number];

/** Мусоргский, «Картинки с выставки»: см. scripts/prepare-audio.ts */
export const MUSIC_TRACKS = [
	"castle",
	"catacombs",
	"cum-mortuis",
	"hut",
] as const;
export type MusicTrack = (typeof MUSIC_TRACKS)[number];

export type RiderColor = "white" | "red" | "black";

export interface VasilisaState {
	/** Точка на земле [x, z] */
	at: [number, number];
	/** Поворот вокруг Y: 0 — лицом к +Z */
	heading: number;
	pose: "walk" | "stand" | "sleep";
	/** Что в руках */
	prop: "doll" | "skull" | null;
}

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
	/** Василиса в кадре (null — нет). */
	vasilisa: VasilisaState | null;
	/** Баба Яга: летит в ступе по небу или стоит у избы. */
	babaYaga: "fly" | "stand" | null;
	/** Всадник, который проносится, когда глава становится активной. */
	rider: RiderColor | null;
	/** Глаза черепов на заборе, 0..1. */
	skulls: number;
	/** Волшебный свет куколки, 0..1. */
	magic: number;
}

/** Точка на высоте `height` над землёй. */
function aboveGround(x: number, z: number, height: number): Vec3 {
	return [x, heightAt(x, z) + height, z];
}

/**
 * Точка у тропы: `distance` метров от избушки по тропе, `side` — вбок
 * (вправо, если смотреть на избушку), `height` — над землёй.
 */
export function onPath(distance: number, height: number, side = 0): Vec3 {
	const f = pathFrame(distance);
	// правая сторона для идущего к избушке: поворот (toHutX, toHutZ) на -90°
	return aboveGround(f.x - f.toHutZ * side, f.z + f.toHutX * side, height);
}

/** Василиса на тропе: идёт к избушке (или от неё). */
function walker(
	distance: number,
	{
		pose = "walk",
		prop = "doll",
		away = false,
	}: Partial<VasilisaState> & { away?: boolean } = {},
): VasilisaState {
	const f = pathFrame(distance);
	const heading = Math.atan2(f.toHutX, f.toHutZ) + (away ? Math.PI : 0);
	return { at: [f.x, f.z], heading, pose, prop: prop ?? null };
}

const HUT: Vec3 = [0, 4.2, 0];
const AT_GATE = walker(8.5, { pose: "stand", prop: "doll" });

// Ключевые кадры по главам (см. docs/scenario.md).
// Избушка в центре поляны (радиус ~13 м), окно смотрит на +Z, тропа уходит на +X+Z,
// солнце встаёт со стороны избушки.
export const KEYFRAMES: SceneKeyframe[] = [
	{
		id: "prologue",
		timeOfDay: 22,
		camera: { position: [26, 30, 34], target: [0, 2, 0], fov: 45 },
		wind: 0.6,
		music: { track: "castle", volume: 0.55 },
		vasilisa: null,
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// девочка идёт по тропе при лунном свете с куколкой в руках; камера впереди
		id: "fire",
		timeOfDay: 1,
		camera: {
			position: onPath(35, 1.5, 0.7),
			target: onPath(40, 1.0),
			fov: 50,
		},
		wind: 0.4,
		music: { track: "cum-mortuis", volume: 0.6 },
		vasilisa: walker(40),
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// камера за спиной Василисы, впереди проносится белый всадник, вдали светает
		id: "white-rider",
		timeOfDay: 5.3,
		camera: {
			position: onPath(36, 1.75, 0.45),
			target: onPath(29.5, 1.2),
			fov: 55,
		},
		wind: 0.3,
		music: { track: "castle", volume: 0.5 },
		vasilisa: walker(33),
		babaYaga: null,
		rider: "white",
		skulls: 0,
		magic: 0,
	},
	{
		// Василиса чуть дальше, камера за другим плечом, проносится красный всадник
		id: "red-rider",
		timeOfDay: 6.6,
		camera: {
			position: onPath(31.5, 1.75, -0.55),
			target: onPath(25.5, 1.1),
			fov: 55,
		},
		wind: 0.35,
		music: { track: "castle", volume: 0.55 },
		vasilisa: walker(28.5),
		babaYaga: null,
		rider: "red",
		skulls: 0,
		magic: 0,
	},
	{
		// камера чуть снизу показывает лицо Василисы, освещённое взошедшим солнцем
		id: "sunrise",
		timeOfDay: 8,
		camera: {
			position: onPath(24.2, 0.8, 0.35),
			target: onPath(26, 1.35),
			fov: 45,
		},
		wind: 0.3,
		music: { track: "castle", volume: 0.6 },
		vasilisa: walker(26, { pose: "stand" }),
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// с высоты птичьего полёта: Василиса выходит на поляну с избой, закат
		id: "clearing",
		timeOfDay: 17.3,
		camera: { position: [-2, 24, 2], target: [6, 0, 10], fov: 55 },
		wind: 0.35,
		music: { track: "catacombs", volume: 0.6 },
		vasilisa: walker(14),
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// по поляне проносится чёрный всадник, ночь; камера у избы, снизу вверх;
		// у черепов на заборе загораются глаза
		id: "black-rider",
		timeOfDay: 21,
		camera: {
			position: [8.8, heightAt(8.8, 3.4) + 0.45, 3.4],
			target: [0, 3.6, 0],
			fov: 62,
		},
		wind: 0.5,
		music: { track: "catacombs", volume: 0.7 },
		vasilisa: AT_GATE,
		babaYaga: null,
		rider: "black",
		skulls: 1,
		magic: 0,
	},
	{
		// камера смотрит в небо, изба у края кадра, по небу летит Баба Яга в ступе
		id: "baba-yaga",
		timeOfDay: 22.5,
		camera: { position: [7.5, 1.6, 7.5], target: [-4, 18, -8], fov: 62 },
		wind: 1,
		music: { track: "hut", volume: 0.85 },
		vasilisa: AT_GATE,
		babaYaga: "fly",
		rider: null,
		skulls: 1,
		magic: 0,
	},
	{
		// камера отдаляется от избы: Василиса спит на земле, куколка колдует
		id: "tasks",
		timeOfDay: 23.5,
		camera: { position: [6.6, 1.9, 7.6], target: [3.3, 0.3, 4.5], fov: 48 },
		wind: 0.3,
		music: { track: "cum-mortuis", volume: 0.6 },
		vasilisa: { at: [3.4, 4.6], heading: 2.2, pose: "sleep", prop: null },
		babaYaga: null,
		rider: null,
		skulls: 1,
		magic: 1,
	},
	{
		// Баба Яга протягивает череп на палке со светящимися глазами
		id: "skull",
		timeOfDay: 4,
		camera: { position: [3.7, 1.5, 4.5], target: [0.3, 1.2, 3.6], fov: 55 },
		wind: 0.6,
		music: { track: "hut", volume: 0.75 },
		vasilisa: { at: [0.5, 4.7], heading: Math.PI, pose: "stand", prop: null },
		babaYaga: "stand",
		rider: null,
		skulls: 1,
		magic: 0,
	},
	{
		// с высоты птичьего полёта: Василиса уходит на краю сцены, дымок над избой
		id: "epilogue",
		timeOfDay: 7.5,
		camera: { position: [-8, 28, 16], target: [4, 0, 7], fov: 50 },
		wind: 0.3,
		music: { track: "castle", volume: 0.6 },
		vasilisa: walker(11, { away: true, prop: "skull" }),
		babaYaga: null,
		rider: null,
		skulls: 0.3,
		magic: 0,
	},
];

/** Где и как проносятся всадники (метры по тропе / от избушки). */
export const RIDER_PATHS: Record<
	RiderColor,
	{ from: Vec3; to: Vec3; duration: number }
> = {
	white: { from: onPath(27, 0, -16), to: onPath(27, 0, 16), duration: 3.5 },
	red: { from: onPath(23, 0, 16), to: onPath(23, 0, -16), duration: 3.5 },
	black: { from: [-9.5, 0, -11], to: [-10, 0, 11], duration: 4 },
};

export { HUT };

/** Полёт Бабы Яги по небу (глава «Баба Яга»): квадратичная кривая Безье. */
export const BABA_YAGA_FLIGHT: [Vec3, Vec3, Vec3] = [
	[9, 16, -13],
	[-1, 15, -5],
	[-13, 12, 1],
];

/** Где стоит Баба Яга, протягивая череп (глава «Череп-светоч»). */
export const BABA_YAGA_STAND = { x: 0.1, z: 2.7 };
