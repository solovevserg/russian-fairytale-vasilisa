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
	/** Высота над землёй, м (например, на крыльце избушки). */
	elevation?: number;
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
	/** Множитель плотности тумана (1 — как в палитре времени суток). */
	fog?: number;
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

/**
 * Крыльцо избушки — настил с перилами перед дверью, как он есть в модели
 * (замерено по вершинам hut.glb). Дверь смотрит на ворота и тропу.
 */
export const PORCH = {
	/** Единичный вектор от центра избы к двери (на ворота). */
	dir: [0.55, 0.835] as [number, number],
	/** Расстояние от центра избы до начала настила, м. */
	wall: 2.35,
	/** Высота настила над землёй, м. */
	height: 2.51,
	/** Глубина (от стены) и ширина настила, м. */
	depth: 0.65,
	width: 2.4,
};
/** Центр настила крыльца [x, z]. */
const PORCH_CENTER: [number, number] = [
	PORCH.dir[0] * (PORCH.wall + PORCH.depth / 2),
	PORCH.dir[1] * (PORCH.wall + PORCH.depth / 2),
];
/** Поворот «вдоль стены с дверью» — так Василиса ложится на крыльце. */
const ALONG_PORCH = Math.atan2(PORCH.dir[1], -PORCH.dir[0]);
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
			target: onPath(30, 0.9, 2.6),
			fov: 55,
		},
		wind: 0.3,
		music: { track: "castle", volume: 0.5 },
		vasilisa: walker(33),
		babaYaga: null,
		rider: "white",
		skulls: 0,
		magic: 0,
		fog: 2.6,
	},
	{
		// Василиса чуть дальше, камера за другим плечом, проносится красный всадник
		id: "red-rider",
		timeOfDay: 5.3,
		camera: {
			position: onPath(31.5, 1.75, -0.2),
			target: onPath(24, 1.0, 0),
			fov: 55,
		},
		wind: 0.35,
		music: { track: "castle", volume: 0.55 },
		vasilisa: walker(28.5),
		babaYaga: null,
		rider: "red",
		skulls: 0,
		magic: 0,
		fog: 2.4,
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
		// из-за избушки, с высоты: видны стены, вся поляна и Василиса у входа
		camera: { position: [-10, 16, 2], target: [3, 0.5, 5], fov: 45 },
		wind: 0.35,
		music: { track: "catacombs", volume: 0.6 },
		vasilisa: walker(12),
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
			position: [11.5, heightAt(11.5, 4.5) + 1.1, 4.5],
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
		// с тропы у края поляны: в кадре и заход на посадку в небе, и посадка у избы
		camera: {
			position: [8, heightAt(8, 11) + 1.4, 11],
			target: [-3, 12, -5],
			fov: 70,
		},
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
		// сверху на крыльцо: Василиса спит, перед ней колдует куколка
		camera: {
			position: [
				PORCH_CENTER[0] + PORCH.dir[0] * 3.6 - PORCH.dir[1] * 1.6,
				heightAt(0, 0) + PORCH.height + 3.2,
				PORCH_CENTER[1] + PORCH.dir[1] * 3.6 + PORCH.dir[0] * 1.6,
			],
			target: [
				PORCH_CENTER[0],
				heightAt(0, 0) + PORCH.height + 0.3,
				PORCH_CENTER[1],
			],
			fov: 45,
		},
		wind: 0.3,
		music: { track: "cum-mortuis", volume: 0.6 },
		vasilisa: {
			at: PORCH_CENTER,
			heading: ALONG_PORCH,
			pose: "sleep",
			prop: null,
			elevation: PORCH.height,
		},
		babaYaga: null,
		rider: null,
		skulls: 1,
		magic: 1,
	},
	{
		// череп на палке уже у Василисы: из глаз бьют лучи, она уходит от Бабы Яги
		id: "skull",
		timeOfDay: 4,
		// из-за спины Бабы Яги: Василиса за воротами уходит прочь с черепом
		camera: {
			position: [-0.27, heightAt(-0.27, 3.9) + 2.2, 3.9],
			target: [4.9, 1.2, 7.4],
			fov: 50,
		},
		wind: 0.6,
		music: { track: "hut", volume: 0.75 },
		vasilisa: {
			at: [4.9, 7.4],
			heading: Math.atan2(3.1, 2.1),
			pose: "stand",
			prop: "skull",
		},
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
/** Маршруты всадников (сплайн по точкам на земле) и длительность скачки, с. */
export const RIDER_PATHS: Record<
	RiderColor,
	{ points: Vec3[]; duration: number }
> = {
	white: { points: [onPath(27, 0, -16), onPath(27, 0, 16)], duration: 3.5 },
	red: { points: [onPath(23, 0, 16), onPath(23, 0, -16)], duration: 3.5 },
	// из леса — прямо перед камерой, кругом вокруг избы — и в чащу
	black: {
		points: [
			[17, 0, -1],
			[9, 0, 2.6],
			[4.6, 0, 6.9],
			[-2, 0, 8],
			[-7.6, 0, 3],
			[-7.2, 0, -4],
			[-1, 0, -8.2],
			[6, 0, -6],
			[13, 0, -9],
			[24, 0, -16],
		],
		duration: 9,
	},
};

export { HUT };

/**
 * Полёт Бабы Яги (глава «Баба Яга»): сплайн Катмулла-Рома — заходит высоко
 * с края неба, виражом снижается, пролетает мимо камеры и садится у избушки.
 */
export const BABA_YAGA_FLIGHT: Vec3[] = [
	[11, 19, -15],
	[1, 17, -11],
	[-7, 14, -6],
	[-9, 10, 1],
	[-3, 6.5, 6],
	[4, 3.6, 9.2],
	[5.5, 2.2, 6.8],
	[1, 1, 6.2],
	[-2.5, 0, 5],
];

/** Где стоит Баба Яга, протягивая череп (глава «Череп-светоч»). */
export const BABA_YAGA_STAND = {
	x: 1.8,
	z: 5.3,
	heading: Math.atan2(3.1, 2.1),
};
