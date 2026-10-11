import {heightAt, pathFrame} from "../scene/terrain";
import {CHAPTER_IDS, type ChapterId} from "./chapters";
import {
	facing,
	GATE_SPOT,
	HOME_SPOT,
	onPath,
	type PathSpot,
	PORCH,
	PORCH_CENTER,
	PORCH_FLOOR,
	SKULL_HANDOVER,
} from "./places";
import type {
	KeyframeInput,
	SceneKeyframe,
	VasilisaInput,
	VasilisaState,
	Vec3,
} from "./types";

/** Василиса на тропе: идёт к избушке (или от неё). */
function walker(
	distance: number,
	{
		pose = "walk",
		prop = "doll",
		away = false,
	}: Partial<VasilisaInput> & {away?: boolean} = {},
): VasilisaInput {
	const f = pathFrame(distance);
	const heading = Math.atan2(f.toHutX, f.toHutZ) + (away ? Math.PI : 0);
	return {at: [f.x, f.z], heading, pose, prop: prop ?? null, path: distance};
}

/** Василиса стоит на месте у тропы — лицом к избушке. */
function standingAt(
	spot: PathSpot,
	prop: VasilisaInput["prop"],
): VasilisaInput {
	const [x, , z] = onPath(spot.path, 0, spot.side);
	return {
		...walker(spot.path, {pose: "stand", prop}),
		at: [x, z],
		side: spot.side,
	};
}

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
		elevation: PORCH_FLOOR - heightAt(at[0], at[1]),
	};
})();

const AT_GATE = standingAt(GATE_SPOT, "doll");

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
	const her = onPath(HOME_SPOT.path, 1.2, HOME_SPOT.side);
	const p = HOME_CAMERA.position;
	const position = p.map((v, i) => v + (her[i] - v) * PROLOGUE_CLOSER) as Vec3;
	// взгляд ниже — Василиса ближе к верху кадра: низ на телефоне закрыт текстом
	return {...HOME_CAMERA, position, target: onPath(52.5, -0.2, -4.8)};
})();

/** На титульной карточке камера дальше, чем в прологе, на этот вектор. */
export const TITLE_SHIFT = HOME_CAMERA.position.map(
	(v, i) => v - PROLOGUE_CAMERA.position[i],
) as Vec3;

/**
 * Кадры глав (см. docs/scenario.md). Пропущенная или лишняя глава — ошибка
 * типов; порядок — из CHAPTER_IDS.
 */
export const SCENES: Record<ChapterId, KeyframeInput> = {
	// Василиса с куколкой у своей избы, в начале тропы; день
	prologue: {
		hut: false,
		timeOfDay: 13,
		house: true,
		camera: PROLOGUE_CAMERA,
		wind: 0.6,
		music: {track: "castle", volume: 0.55},
		vasilisa: standingAt(HOME_SPOT, "doll"),
		babaYaga: null,
		rider: null,
		skulls: 0,
		magic: 0,
	},
	// девочка идёт по тропе при лунном свете с куколкой в руках; камера впереди
	fire: {
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
	// камера за спиной Василисы, впереди проносится белый всадник, вдали светает
	"white-rider": {
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
	// Василиса чуть дальше, камера за другим плечом, проносится красный всадник
	"red-rider": {
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
	// камера чуть снизу показывает лицо Василисы, освещённое взошедшим солнцем
	sunrise: {
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
	// с высоты птичьего полёта: Василиса выходит на поляну с избой, закат
	clearing: {
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
	// по поляне проносится чёрный всадник, ночь; камера у избы, снизу вверх;
	// у черепов на заборе загораются глаза
	"black-rider": {
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
	// камера смотрит в небо, изба у края кадра, по небу летит Баба Яга в ступе
	"baba-yaga": {
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
	// камера отдаляется от избы: Василиса спит на земле, куколка колдует
	tasks: {
		// работа — на весь день: Баба Яга улетает с утра, куколка всё делает
		timeOfDay: 13,
		// ночь — рассвет — день: не вспышкой, а за несколько секунд
		timeFade: 6,
		// сверху на крыльцо: Василиса спит, перед ней колдует куколка
		camera: {
			position: [
				PORCH_CENTER[0] + PORCH.dir[0] * 3.6 - PORCH.dir[1] * 1.6,
				PORCH_FLOOR + 3.2,
				PORCH_CENTER[1] + PORCH.dir[1] * 3.6 + PORCH.dir[0] * 1.6,
			],
			target: [PORCH_CENTER[0], PORCH_FLOOR + 0.3, PORCH_CENTER[1]],
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
	// череп на палке уже у Василисы: из глаз бьют лучи, она уходит от Бабы Яги
	skull: {
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
			at: SKULL_HANDOVER.vasilisa,
			heading: facing(SKULL_HANDOVER.vasilisa, SKULL_HANDOVER.babaYaga),
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
	// к вечеру следующего дня Василиса дома; камера идёт следом, потом
	// поднимается и смотрит с высоты на избушку (homecoming.ts)
	epilogue: {
		timeOfDay: 19.5,
		house: true,
		houseLit: false,
		camera: HOME_CAMERA,
		wind: 0.3,
		music: {track: "castle", volume: 0.6},
		// продолжает путь с того места, где была, и обходит избу (homecoming.ts);
		// здесь — только запасная точка для статичного кадра
		vasilisa: {...standingAt(HOME_SPOT, "skull"), pose: "return"},
		// огонь погас ещё до её ухода — окна тёмные, свет несёт череп
		babaYaga: null,
		rider: null,
		skulls: 0.3,
		magic: 0,
	},
};

/** Василиса со всеми значениями по умолчанию. */
function resolveVasilisa(v: VasilisaInput): VasilisaState {
	return {elevation: 0, side: 0, window: [0, 1], onward: 0, ...v};
}

/**
 * Кадр главы со всеми значениями по умолчанию — один раз при загрузке:
 * дальше в коде пропусков нет.
 */
export function resolveKeyframe(
	id: ChapterId,
	k: KeyframeInput,
): SceneKeyframe {
	return {
		fog: 1,
		house: false,
		houseLit: true,
		hut: true,
		timeFade: 0,
		transition: 0,
		...k,
		id,
		camera: {via: [], ...k.camera},
		vasilisa: k.vasilisa && resolveVasilisa(k.vasilisa),
	};
}

/** Кадры глав по порядку (CHAPTER_IDS). */
export const KEYFRAMES: SceneKeyframe[] = CHAPTER_IDS.map((id) =>
	resolveKeyframe(id, SCENES[id]),
);
