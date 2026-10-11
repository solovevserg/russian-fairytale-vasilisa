import {dampFactor} from "../lib/damp";
import {smooth01} from "../lib/math";
import {pathFrame} from "../scene/terrain";
import {departureAt} from "./departure";
import {homecomingAt, homecomingClock, homecomingRoute} from "./homecoming";
import {INTRO_TIME, introAt} from "./intro";
import type {TimelineSample} from "./timeline";

/** Где героиня на земле и куда смотрит. */
export interface HeroinePose {
	x: number;
	z: number;
	heading: number;
}

/** Василиса в кадре таймлайна. */
type Sample = TimelineSample["vasilisa"];

/** Что движения знают о кадре. */
interface MotionContext {
	/** Часы сцены, с. */
	now: number;
	/** Сцена в самом начале (на прологе) — для подлёта при открытии. */
	atStart: boolean;
	/** Где героиня была в прошлом кадре (null — не была видна). */
	last: HeroinePose | null;
}

/**
 * Движение по своим часам — вместо положения по таймлайну. Каждый кадр
 * узнаёт, идёт ли оно (и заводит или сбрасывает часы), и пишет позу.
 */
interface Motion {
	/** Идёт ли в этом кадре; заводит часы при начале, сбрасывает при конце. */
	update(v: Sample, ctx: MotionContext): boolean;
	/** Поза, пока идёт. */
	pose(v: Sample, out: HeroinePose): void;
	/**
	 * Когда кончается раньше времени (листнули), положение скачет к
	 * таймлайну — этот скачок сглаживается.
	 */
	smoothsJump: boolean;
}

/** Как медленно идёт дальше, дойдя до кадра (onward), м/с. */
const ONWARD_SPEED = 0.35;
/** Скачок больше этого (м) — не сглаживаем: это смена сцены, а не рывок. */
const MAX_SMOOTHED_JUMP = 3;
/** Как быстро догоняет положение по таймлайну после скачка. */
const JUMP_DAMPING = 3;

/** Зачин: выходит из-за избы при открытии сайта на прологе — один раз. */
function introMotion(instant: boolean): Motion {
	const state = {start: -1, done: instant, x: 0, z: 0, heading: 0};
	return {
		smoothsJump: true,
		update(v, {now, atStart}) {
			if (state.done) return false;
			if (state.start < 0) {
				if (atStart) state.start = now;
				else state.done = true;
			}
			const t = now - state.start;
			// листнули — сразу в кадр главы
			if (!atStart || t > INTRO_TIME) state.done = true;
			else introAt(t, v.heading, state);
			return !state.done;
		},
		pose(_, out) {
			out.x = state.x;
			out.z = state.z;
			out.heading = state.heading;
		},
	};
}

/** «Череп-светоч»: уходит по тропе — по часам с входа в главу. */
function departureMotion(): Motion {
	const state = {start: -1, x: 0, z: 0, heading: 0};
	return {
		smoothsJump: false,
		update(v, {now}) {
			if (v.pose !== "leave") {
				state.start = -1;
				return false;
			}
			if (state.start < 0) state.start = now;
			departureAt(now - state.start, [v.x, v.z], v.heading, state);
			return true;
		},
		pose(_, out) {
			out.x = state.x;
			out.z = state.z;
			out.heading = state.heading;
		},
	};
}

/**
 * «Эпилог»: дальше по тропе с того места, где она сейчас, и вокруг избы.
 * Часы общие с камерой (homecomingClock) — она снимает тот же путь.
 */
function homecomingMotion(): Motion {
	const pose = {x: 0, z: 0, heading: 0, walked: 0};
	return {
		smoothsJump: false,
		update(v, {now, last}) {
			const home = homecomingClock;
			if (v.pose !== "return") {
				home.start = -1;
				return false;
			}
			if (home.start < 0) {
				const from = last ?? v;
				home.start = now;
				home.route = homecomingRoute([from.x, from.z], from.heading);
			}
			if (home.route) homecomingAt(home.route, now - home.start, pose);
			return true;
		},
		pose(_, out) {
			out.x = pose.x;
			out.z = pose.z;
			out.heading = pose.heading;
		},
	};
}

/** Дошла до кадра — медленно идёт дальше по тропе (onward), трогается мягко. */
function onwardMotion(): Motion {
	let start = -1;
	let progress = 0;
	return {
		smoothsJump: true,
		update(v, {now}) {
			if (!(v.onward > 0) || Number.isNaN(v.path)) {
				start = -1;
				return false;
			}
			if (start < 0) start = now;
			progress = Math.min((now - start) / (v.onward / ONWARD_SPEED), 1);
			return true;
		},
		pose(v, out) {
			const f = pathFrame(v.path - v.onward * smooth01(progress));
			const here = pathFrame(v.path);
			out.x = f.x + (v.x - here.x);
			out.z = f.z + (v.z - here.z);
			out.heading = v.heading;
		},
	};
}

/**
 * Где героиня в кадре: таблица движений по приоритету — зачин, уход с
 * черепом, дорога домой, «идёт дальше»; если ни одно не идёт — положение
 * по таймлайну. Поверх — общий слой: скачок к таймлайну, когда движение
 * прервали (листнули), догоняется плавно.
 */
export function createHeroineMotion(instant: boolean) {
	const motions: Motion[] = [
		introMotion(instant),
		departureMotion(),
		homecomingMotion(),
		onwardMotion(),
	];
	const jump = {x: 0, z: 0};
	let smoothing = false;
	let last: HeroinePose | null = null;

	return {
		/**
		 * Поза в этом кадре; null — героини нет в кадре.
		 *
		 * @param atStart — сцена в самом начале (прогресс на прологе).
		 */
		step(
			v: Sample,
			now: number,
			delta: number,
			atStart: boolean,
		): HeroinePose | null {
			if (!v.visible) {
				last = null;
				return null;
			}
			const ctx: MotionContext = {now, atStart, last};
			// часы обновляют все движения, позу задаёт первое идущее
			const running = motions.filter((motion) => motion.update(v, ctx));
			const pose: HeroinePose = {x: v.x, z: v.z, heading: v.heading};
			running[0]?.pose(v, pose);

			const special = running.some((motion) => motion.smoothsJump);
			if (smoothing && !special && last) {
				const gap = Math.hypot(last.x - pose.x, last.z - pose.z);
				if (gap < MAX_SMOOTHED_JUMP) {
					jump.x = last.x - pose.x;
					jump.z = last.z - pose.z;
				}
			}
			smoothing = special;
			const decay = 1 - dampFactor(JUMP_DAMPING, delta);
			jump.x *= decay;
			jump.z *= decay;
			pose.x += jump.x;
			pose.z += jump.z;
			last = pose;
			return pose;
		},
	};
}
