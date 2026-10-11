import type {ChapterId} from "./chapters";

/** Точка или вектор [x, y, z], м. */
export type Vec3 = [number, number, number];

/** Мусоргский, «Картинки с выставки»: см. scripts/prepare-audio.ts */
export const MUSIC_TRACKS = [
	"castle",
	"catacombs",
	"cum-mortuis",
	"hut",
] as const;
/** Музыкальная тема. */
export type MusicTrack = (typeof MUSIC_TRACKS)[number];

/** Цвет всадника: утро, день, ночь. */
export type RiderColor = "white" | "red" | "black";

/** Василиса в кадре — как её задаёт сценарий (необязательное — по умолчанию). */
export interface VasilisaInput {
	/** Точка на земле [x, z] */
	at: [number, number];
	/** Поворот вокруг Y: 0 — лицом к +Z */
	heading: number;
	/**
	 * leave — однократный уход по тропе (см. departure.ts), return — дорога
	 * домой и обход избы (см. homecoming.ts)
	 */
	pose: "walk" | "stand" | "sleep" | "leave" | "return";
	/** Что в руках */
	prop: "doll" | "skull" | null;
	/** Высота над землёй, м (например, на крыльце избушки). По умолчанию 0. */
	elevation?: number;
	/**
	 * Где она на тропе: метров от избушки и вбок (как в onPath). Если задано
	 * у обоих соседних кадров — переходит между ними по тропе, а не напрямик.
	 */
	path?: number;
	/** Вбок от тропы, м (как в onPath). По умолчанию 0. */
	side?: number;
	/**
	 * Остановка на пути к этому кадру: дойдя до `at` (м по тропе) к доле
	 * перехода `from`, стоит до доли `to`, потом идёт дальше.
	 */
	stop?: {at: number; from: number; to: number};
	/**
	 * В какой доле перехода к этому кадру она перемещается (до — на месте).
	 * По умолчанию весь переход — [0, 1].
	 */
	window?: [number, number];
	/**
	 * Дойдя до кадра, не замирает, а медленно идёт дальше по тропе ещё столько
	 * метров (к избушке). По умолчанию 0.
	 */
	onward?: number;
}

/** Василиса в кадре — со всеми значениями (resolveKeyframe). */
export interface VasilisaState
	extends Required<Omit<VasilisaInput, "path" | "stop">> {
	/** Метров от избушки по тропе; нет — она не на тропе. */
	path?: number;
	/** Остановка на пути к этому кадру. */
	stop?: {at: number; from: number; to: number};
}

/** Камера кадра. */
export interface CameraShot {
	position: Vec3;
	target: Vec3;
	fov: number;
}

/** Кадр главы — как его задаёт сценарий (story/scenes.ts). */
export interface KeyframeInput {
	/** Время суток, часы 0..24. Время в истории всегда идёт вперёд. */
	timeOfDay: number;
	camera: CameraShot & {
		/** Промежуточные точки пролёта на пути к этому кадру (поровну по времени). */
		via?: {position: Vec3; target: Vec3}[];
	};
	/** Сила ветра 0..1. */
	wind: number;
	/** Музыкальная тема главы и её громкость 0..1. */
	music: {track: MusicTrack; volume: number};
	/** Василиса в кадре (null — нет). */
	vasilisa: VasilisaInput | null;
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
	/** Изба Василисы в сцене (только у начала и в конце пути). По умолчанию нет. */
	house?: boolean;
	/** Горит ли в избе Василисы свет (по умолчанию да; «Огонь погас» — нет). */
	houseLit?: boolean;
	/**
	 * Избушка Бабы Яги с факелами и частоколом в сцене (по умолчанию да). До
	 * «Поляны» её нет вовсе — появляется сразу, как начался переход к ней.
	 */
	hut?: boolean;
	/**
	 * Не быстрее чем за столько секунд меняется время суток при подходе к
	 * главе. По умолчанию 0 — без ограничения.
	 */
	timeFade?: number;
	/**
	 * Не быстрее чем за столько секунд сцена (камера, герои) переходит к главе.
	 * По умолчанию 0 — без ограничения.
	 */
	transition?: number;
}

/** Кадр главы — со всеми значениями (resolveKeyframe): в коде без `??`. */
export interface SceneKeyframe
	extends Required<Omit<KeyframeInput, "vasilisa" | "camera">> {
	/** id главы. */
	id: ChapterId;
	camera: CameraShot & {via: {position: Vec3; target: Vec3}[]};
	vasilisa: VasilisaState | null;
}
