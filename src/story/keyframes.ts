import {heightAt, pathFrame} from "../scene/terrain";

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
	/**
	 * leave — однократный уход по тропе (см. departure.ts), return — дорога
	 * домой и обход избы (см. homecoming.ts)
	 */
	pose: "walk" | "stand" | "sleep" | "leave" | "return";
	/** Что в руках */
	prop: "doll" | "skull" | null;
	/** Высота над землёй, м (например, на крыльце избушки). */
	elevation?: number;
	/**
	 * Где она на тропе: метров от избушки и вбок (как в onPath). Если задано
	 * у обоих соседних кадров — переходит между ними по тропе, а не напрямик.
	 */
	path?: number;
	side?: number;
	/**
	 * Остановка на пути к этому кадру: дойдя до `at` (м по тропе) к доле
	 * перехода `from`, стоит до доли `to`, потом идёт дальше.
	 */
	stop?: {at: number; from: number; to: number};
	/** В какой доле перехода к этому кадру она перемещается (до — на месте). */
	window?: [number, number];
	/**
	 * Дойдя до кадра, не замирает, а медленно идёт дальше по тропе ещё столько
	 * метров (к избушке).
	 */
	onward?: number;
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
		/** Промежуточные точки пролёта на пути к этому кадру (поровну по времени). */
		via?: {position: Vec3; target: Vec3}[];
	};
	/** Сила ветра 0..1. */
	wind: number;
	/** Музыкальная тема главы и её громкость 0..1. */
	music: {track: MusicTrack; volume: number};
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
	/** Изба Василисы в сцене (только у начала и в конце пути). */
	house?: boolean;
	/** Горит ли в избе Василисы свет (по умолчанию да; «Огонь погас» — нет). */
	houseLit?: boolean;
	/**
	 * Избушка Бабы Яги с факелами и частоколом в сцене (по умолчанию да). До
	 * «Поляны» её нет вовсе — появляется сразу, как начался переход к ней.
	 */
	hut?: boolean;
	/** Не быстрее чем за столько секунд меняется время суток при подходе к главе. */
	timeFade?: number;
	/** Не быстрее чем за столько секунд сцена (камера, герои) переходит к главе. */
	transition?: number;
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
	}: Partial<VasilisaState> & {away?: boolean} = {},
): VasilisaState {
	const f = pathFrame(distance);
	const heading = Math.atan2(f.toHutX, f.toHutZ) + (away ? Math.PI : 0);
	return {at: [f.x, f.z], heading, pose, prop: prop ?? null, path: distance};
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
/**
 * Где спит Василиса: ноги — у края настила, голова повёрнута к двери и
 * стене избы (поворот вокруг ступней на SLEEP_TURN от «вдоль стены»).
 */
const SLEEP_TURN = 0.38;
/** Половина роста лёжа: от центра (там точка героини) до ступней, м. */
const HALF_BODY = 0.75;
const SLEEP = (() => {
	const [dx, dz] = PORCH.dir;
	const base: [number, number] = [
		dx * (PORCH.wall + 0.2),
		dz * (PORCH.wall + 0.2),
	];
	// вдоль стены (туда смотрят ноги), как раньше лежала
	const along = [dz, -dx];
	const feet = [base[0] + along[0] * HALF_BODY, base[1] + along[1] * HALF_BODY];
	// ноги на месте, голова ближе к двери: ось тела отклоняется от стены
	const c = Math.cos(SLEEP_TURN);
	const sn = Math.sin(SLEEP_TURN);
	const axis = [along[0] * c + dx * sn, along[1] * c + dz * sn];
	const at: [number, number] = [
		feet[0] - axis[0] * HALF_BODY,
		feet[1] - axis[1] * HALF_BODY,
	];
	return {
		at,
		heading: Math.atan2(axis[0], axis[1]),
		// настил ровный, а земля у тропы проседает — высота от земли под избушкой
		elevation: heightAt(0, 0) + PORCH.height - heightAt(at[0], at[1]),
	};
})();
const AT_GATE = walker(8.5, {pose: "stand", prop: "doll"});

/** Василиса у своей избы (в начале тропы), лицом к лесу и избушке. */
function atHome(prop: VasilisaState["prop"]): VasilisaState {
	const [x, , z] = onPath(51, 0, -2.6);
	return {...walker(51, {pose: "stand", prop}), at: [x, z], side: -2.6};
}

/** Зачин и концовка снимаются одной камерой: тропа у избы Василисы. */
const HOME_CAMERA = {
	position: onPath(43, 2.3, 2.4),
	// взгляд пониже: на телефоне низ кадра закрыт карточкой с текстом
	target: onPath(52.5, 0.9, -4.8),
	fov: 50,
};

/** Пролог — та же камера, но ближе к Василисе (с титула она подлетает). */
const PROLOGUE_CLOSER = 0.3;
const PROLOGUE_CAMERA = (() => {
	const her = onPath(51, 1.2, -2.6);
	const p = HOME_CAMERA.position;
	const position = p.map((v, i) => v + (her[i] - v) * PROLOGUE_CLOSER) as Vec3;
	// взгляд ниже — Василиса ближе к верху кадра: низ на телефоне закрыт текстом
	return {...HOME_CAMERA, position, target: onPath(52.5, -0.2, -4.8)};
})();
/** На титульной карточке камера дальше, чем в прологе, на этот вектор. */
export const TITLE_SHIFT = HOME_CAMERA.position.map(
	(v, i) => v - PROLOGUE_CAMERA.position[i],
) as Vec3;

// Ключевые кадры по главам (см. docs/scenario.md).
// Избушка в центре поляны (радиус ~13 м), окно смотрит на +Z, тропа уходит на +X+Z,
// солнце встаёт со стороны избушки.
export const KEYFRAMES: SceneKeyframe[] = [
	{
		// Василиса с куколкой у своей избы, в начале тропы; день
		id: "prologue",
		hut: false,
		timeOfDay: 13,
		house: true,
		camera: PROLOGUE_CAMERA,
		wind: 0.6,
		music: {track: "castle", volume: 0.55},
		vasilisa: atHome("doll"),
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// девочка идёт по тропе при лунном свете с куколкой в руках; камера впереди
		id: "fire",
		hut: false,
		timeOfDay: 1,
		house: true,
		// от избы по тропинке — шагом, а не рывком; огонь в избе погас
		transition: 6,
		timeFade: 4.5,
		houseLit: false,
		camera: {
			position: onPath(35, 1.5, 0.7),
			target: onPath(40, 1.0),
			fov: 50,
		},
		wind: 0.4,
		music: {track: "cum-mortuis", volume: 0.6},
		// останавливается чуть раньше середины кадра и медленно доходит до неё
		vasilisa: {...walker(41.5), onward: 2.5},
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// камера за спиной Василисы, впереди проносится белый всадник, вдали светает
		id: "white-rider",
		hut: false,
		timeOfDay: 5.3,
		// она проходит мимо камеры, а камера облетает её справа и встаёт за спину
		transition: 4.5,
		camera: {
			position: onPath(36, 1.75, 0.45),
			// вдоль тропы, туда, где её перебежит всадник (узкий кадр телефона)
			target: onPath(28, 1.0, 0.5),
			fov: 55,
			via: [
				{position: onPath(36.3, 1.6, 1.9), target: onPath(37.7, 1.1)},
				{position: onPath(36.9, 1.7, 1.6), target: onPath(35.3, 1.0)},
			],
		},
		wind: 0.3,
		music: {track: "castle", volume: 0.5},
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
		hut: false,
		timeOfDay: 5.3,
		camera: {
			// на узком экране телефона она не уходит за край при покачивании,
			// и над карточкой с текстом — а всаднику хватает места
			position: onPath(31.5, 1.75, 0.6),
			target: onPath(24, 0.1, 0.3),
			fov: 55,
		},
		wind: 0.35,
		music: {track: "castle", volume: 0.55},
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
		hut: false,
		timeOfDay: 8,
		// камера не сквозь неё, а облетает справа, не сводя с неё взгляда
		transition: 3.5,
		camera: {
			position: onPath(24.2, 0.8, 0.35),
			target: onPath(26, 1.35),
			fov: 45,
			via: [
				{position: onPath(28.9, 1.6, 1.9), target: onPath(27.7, 1.3)},
				{position: onPath(25.9, 1.3, 1.9), target: onPath(26.8, 1.35)},
			],
		},
		wind: 0.3,
		music: {track: "castle", volume: 0.6},
		vasilisa: walker(26, {pose: "stand"}),
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	{
		// с высоты птичьего полёта: Василиса выходит на поляну с избой, закат
		id: "clearing",
		timeOfDay: 17.3,
		// «целый день шла»: от утра до заката — не рывком, а за несколько секунд
		timeFade: 6.5,
		// идёт не спеша: в нескольких метрах от забора останавливается,
		// потом подходит ближе
		transition: 11,
		// из-за избушки, с высоты: видны стены, вся поляна и Василиса у входа
		camera: {position: [-10, 16, 2], target: [3, 0.5, 5], fov: 45},
		wind: 0.35,
		music: {track: "catacombs", volume: 0.6},
		// идёт не спеша — не обгоняет камеру
		vasilisa: {...walker(13.5), stop: {at: 18, from: 0.55, to: 0.65}},
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
		// не сквозь избушку: полукругом вправо, всё время глядя на неё
		transition: 5,
		camera: {
			position: [11.5, heightAt(11.5, 4.5) + 1.1, 4.5],
			// не слишком вверх: на телефоне низ кадра закрыт текстом, а всадник
			// скачет по земле
			target: [0, 1.8, 0],
			fov: 62,
			via: [
				{position: [-7.6, 10, 10.6], target: [0.5, 2.5, 2]},
				{position: [3.6, 4.5, 12.4], target: [0, 3.2, 0.5]},
			],
		},
		wind: 0.5,
		music: {track: "catacombs", volume: 0.7},
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
		music: {track: "hut", volume: 0.85},
		vasilisa: AT_GATE,
		babaYaga: "fly",
		rider: null,
		skulls: 1,
		magic: 0,
	},
	{
		// камера отдаляется от избы: Василиса спит на земле, куколка колдует
		id: "tasks",
		// работа — на весь день: Баба Яга улетает с утра, куколка всё делает
		timeOfDay: 13,
		// ночь — рассвет — день: не вспышкой, а за несколько секунд
		timeFade: 6,
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
		music: {track: "cum-mortuis", volume: 0.6},
		vasilisa: {
			...SLEEP,
			pose: "sleep",
			prop: null,
			// пока камера смотрит в небо — она уже на крыльце
			window: [0.12, 0.12],
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
			// подальше назад и повыше: Баба Яга не заслоняет Василису, а на
			// телефоне обе — над карточкой с текстом
			// левее (относительно взгляда): Баба Яга — справа в кадре, слева —
			// тропа, по которой уходит Василиса
			position: [-1.0, heightAt(-1.0, 1.5) + 2.1, 1.5],
			// чуть правее места, где она стоит: тропа уводит её вправо, в лес
			target: [6.4, 0.6, 8.4],
			fov: 50,
		},
		wind: 0.6,
		music: {track: "hut", volume: 0.75},
		// стоит лицом к Бабе Яге, затем разворачивается и уходит по тропе в лес
		vasilisa: {
			at: [4.9, 7.4],
			heading: Math.atan2(-3.1, -2.1),
			pose: "leave",
			prop: "skull",
			// с крыльца к воротам — сразу, без медленного переезда
			window: [0.5, 0.5],
		},
		babaYaga: "stand",
		rider: null,
		skulls: 1,
		magic: 0,
	},
	{
		// к вечеру следующего дня Василиса дома; камера идёт следом, потом
		// поднимается и смотрит с высоты на избушку (homecoming.ts)
		id: "epilogue",
		timeOfDay: 19.5,
		house: true,
		houseLit: false,
		camera: HOME_CAMERA,
		wind: 0.3,
		music: {track: "castle", volume: 0.6},
		// продолжает путь с того места, где была, и обходит избу (homecoming.ts);
		// здесь — только запасная точка для статичного кадра
		vasilisa: {...atHome("skull"), pose: "return"},
		// огонь погас ещё до её ухода — окна тёмные, свет несёт череп
		babaYaga: null,
		rider: null,
		skulls: 0.3,
		magic: 0,
	},
];

/** Чёрный всадник скачет кругом вокруг забора, м от центра избушки. */
const BLACK_RIDER_RADIUS = 10;

/**
 * Чёрный всадник: из леса — близко мимо камеры, два круга вокруг забора
 * (каждый раз снова мимо камеры) — и в чащу.
 */
function blackRiderPoints(): Vec3[] {
	const points: Vec3[] = [[19, 0, -4]];
	const laps = 2;
	const steps = 12 * laps;
	// против часовой стрелки (если смотреть сверху), от камеры через ворота
	for (let i = 0; i <= steps; i++) {
		const angle = -0.25 + (i / steps) * Math.PI * 2 * laps;
		points.push([
			Math.cos(angle) * BLACK_RIDER_RADIUS,
			0,
			Math.sin(angle) * BLACK_RIDER_RADIUS,
		]);
	}
	points.push([16, 0, -10], [25, 0, -17]);
	return points;
}

/**
 * Маршруты всадников (сплайн по точкам на земле), длительность скачки и
 * задержка от входа в главу, с.
 */
export const RIDER_PATHS: Record<
	RiderColor,
	{points: Vec3[]; duration: number; delay: number}
> = {
	// перебегает ей дорогу слева направо — наискосок, чтобы дольше быть в кадре
	white: {
		points: [onPath(14, 0, -10), onPath(21, 0, 0), onPath(27, 0, 9)],
		duration: 4.5,
		delay: 0,
	},
	red: {
		points: [onPath(23, 0, 16), onPath(23, 0, -16)],
		duration: 3.5,
		delay: 0,
	},
	// секунда — чтобы камера успела встать туда, где он проскачет
	black: {points: blackRiderPoints(), duration: 17, delay: 0.3},
};

export {HUT};

/**
 * Полёт Бабы Яги (глава «Баба Яга»): сплайн Катмулла-Рома — заходит высоко
 * с края неба, виражом снижается, пролетает мимо камеры, уходит за избушку,
 * облетает её кругом и садится во дворе.
 */
export const BABA_YAGA_FLIGHT: Vec3[] = [
	[11, 19, -15],
	[1, 17, -11],
	[-7, 14, -6],
	[-9, 10, 1],
	[-3, 6.5, 6],
	[4, 3.6, 9.2],
	[9.5, 4.2, 5],
	[8.5, 5, -3],
	[2, 5.5, -8.5],
	[-5, 5, -7.5],
	[-9, 4, -1],
	[-7.5, 3, 4.5],
	[-4.5, 1.4, 5.8],
	[-2.5, 0, 5],
];

/** Где стоит Баба Яга, протягивая череп (глава «Череп-светоч»). */
export const BABA_YAGA_STAND = {
	x: 1.8,
	z: 5.3,
	heading: Math.atan2(3.1, 2.1),
};
