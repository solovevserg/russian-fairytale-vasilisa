import {describe, expect, test} from "bun:test";

import {PerspectiveCamera, Vector3} from "three";

import {heightAt, pathFrame} from "../../src/scene/terrain";
import {creditsCamera, HOMECOMING} from "../../src/story/homecoming";
import {stepScene} from "../../src/story/lightDelay";
import {KEYFRAMES} from "../../src/story/scenes";
import {createSample, createTimeline} from "../../src/story/timeline";
import type {SceneKeyframe} from "../../src/story/types";

/**
 * Сквозные свойства сцены — сеть безопасности для рефакторинга (см.
 * docs/refactoring.md, фаза 0): то, что не должно ломаться при любой
 * перестановке кода.
 */

const indexOf = (id: string) => KEYFRAMES.findIndex((k) => k.id === id);
const timeline = createTimeline(KEYFRAMES);
const LAST = KEYFRAMES.length - 1;
/** Шаг прогресса при прогоне таймлайна. */
const STEP = 0.002;

/** Прогон таймлайна от `from` до `to` с шагом STEP: (прогресс, кадр). */
function* sweep(from = 0, to = LAST) {
	const s = createSample();
	for (let p = from; p <= to + 1e-9; p += STEP)
		yield [p, timeline.sample(p, s)] as const;
}

/** Телефон: экран целиком под сценой, снизу — карточка с текстом. */
const PHONE_ASPECT = 390 / 844;
/** Карточка с текстом на телефоне — не выше 48% экрана (global.css). */
const CARD_TOP = -1 + 2 * 0.48;

function cameraOf(k: SceneKeyframe, aspect: number) {
	const camera = new PerspectiveCamera(k.camera.fov, aspect, 0.1, 600);
	camera.position.set(...k.camera.position);
	camera.lookAt(new Vector3(...k.camera.target));
	camera.updateMatrixWorld();
	return camera;
}

describe("кадр на телефоне", () => {
	// главы, где героиня в кадре по раскадровке (в «Белом всаднике» камера за
	// спиной смотрит вдоль тропы, в «Чёрном всаднике» и «Бабе Яге» — на избу и в небо)
	const chapters = [
		"prologue",
		"fire",
		"red-rider",
		"sunrise",
		"clearing",
		"tasks",
		"skull",
		"epilogue",
	];
	for (const id of chapters) {
		test(`«${id}»: Василиса в кадре, голова над карточкой с текстом`, () => {
			const k = KEYFRAMES[indexOf(id)];
			const v = k.vasilisa;
			if (!v) throw new Error(`в «${id}» нет героини`);
			const camera = cameraOf(k, PHONE_ASPECT);
			const [x, z] = v.at;
			const ground = heightAt(x, z) + v.elevation;
			const head = new Vector3(x, ground + (v.pose === "sleep" ? 0.3 : 1.4), z);
			const p = head.project(camera);
			expect(p.z).toBeLessThan(1);
			expect(Math.abs(p.x)).toBeLessThan(0.95);
			expect(p.y).toBeGreaterThan(CARD_TOP);
			expect(p.y).toBeLessThan(0.95);
		});
	}
});

describe("непрерывность таймлайна", () => {
	/**
	 * Где Василиса переносится скачком по сценарию: `window` с нулевой длиной
	 * (переход за кадром) — или стык с «идёт дальше» (onward): этот скачок
	 * сглаживает сам компонент Vasilisa.
	 */
	function allowedJump(i: number): number {
		const b = KEYFRAMES[i + 1]?.vasilisa;
		const a = KEYFRAMES[i]?.vasilisa;
		if (b && b.window[0] === b.window[1]) return Number.POSITIVE_INFINITY;
		return (a?.onward ?? 0) + 0.5;
	}

	test("Василиса не перескакивает между соседними точками прогресса", () => {
		const prev = {x: 0, z: 0, visible: false};
		for (const [p, s] of sweep()) {
			const v = s.vasilisa;
			if (v.visible && prev.visible) {
				const step = Math.hypot(v.x - prev.x, v.z - prev.z);
				const limit = Math.max(0.1, allowedJump(Math.floor(p - 1e-9)));
				if (step > limit)
					throw new Error(`скачок ${step.toFixed(2)} м на ${p.toFixed(3)}`);
			}
			Object.assign(prev, {x: v.x, z: v.z, visible: v.visible});
		}
	});

	test("камера движется плавно", () => {
		const prev = new Vector3();
		let first = true;
		for (const [p, s] of sweep()) {
			if (!first) {
				const step = s.position.distanceTo(prev);
				if (step > 0.6)
					throw new Error(
						`камера прыгнула на ${step.toFixed(2)} м на ${p.toFixed(3)}`,
					);
			}
			prev.copy(s.position);
			first = false;
		}
	});
});

describe("флаги сцены по главам", () => {
	const fire = indexOf("fire");
	const clearing = indexOf("clearing");
	const blackRider = indexOf("black-rider");

	test("свет в избе Василисы горит только в прологе, после «Огонь погас» — нет", () => {
		expect(timeline.sample(0).houseLit).toBe(true);
		// гаснет сразу, как начался переход к «Огню»: окна не вспыхивают, пока темнеет
		for (const [, s] of sweep(STEP)) {
			if (s.house) expect(s.houseLit).toBe(false);
		}
		expect(timeline.sample(fire).houseLit).toBe(false);
	});

	test("избушки нет до перехода к «Поляне», дальше она есть всегда", () => {
		for (const [p, s] of sweep()) {
			if (p <= clearing - 1) expect(s.hut).toBe(false);
			if (p >= clearing - 0.95) expect(s.hut).toBe(true);
		}
	});

	test("изба Василисы — только в начале и в конце", () => {
		for (const [p, s] of sweep()) {
			if (p > fire + 0.5 && p < LAST - 0.5) expect(s.house).toBe(false);
		}
	});

	test("глаза черепов загораются не раньше перехода к «Чёрному всаднику»", () => {
		for (const [, s] of sweep(0, blackRider - 1)) expect(s.skulls).toBe(0);
		expect(timeline.sample(blackRider).skulls).toBe(1);
	});

	test("время в истории идёт только вперёд", () => {
		let hours = -1;
		let days = 0;
		let last = -1;
		for (const [, s] of sweep()) {
			if (s.timeOfDay < last - 12) days++;
			const t = days * 24 + s.timeOfDay;
			expect(t).toBeGreaterThanOrEqual(hours - 1e-6);
			hours = t;
			last = s.timeOfDay;
		}
	});
});

describe("скорость переходов между главами", () => {
	/** За сколько секунд сцена дойдёт от `from` до `to` при 60 fps. */
	function seconds(from: number, to: number): number {
		let p = from;
		let t = 0;
		while (Math.abs(to - p) > 0.01 && t < 60) {
			p = stepScene(p, to, 1 / 60, 2.5);
			t += 1 / 60;
		}
		return t;
	}

	for (const [i, k] of KEYFRAMES.entries()) {
		if (!k.transition || i === 0) continue;
		const transition = k.transition;
		test(`к «${k.id}» — не быстрее ${transition} с, назад — быстрее`, () => {
			const forward = seconds(i - 1, i);
			expect(forward).toBeGreaterThanOrEqual(transition * 0.97);
			// назад — без ограничения, только экспоненциальное догоняние
			expect(seconds(i, i - 1)).toBeLessThan(forward * 0.7);
		});
	}
});

describe("камера на титрах", () => {
	const position = new Vector3();
	const target = new Vector3();
	creditsCamera(position, target);
	const hut = new Vector3(0, heightAt(0, 0) + 3, 0);

	for (const [name, aspect] of [
		["компьютер", 864 / 900],
		["телефон", PHONE_ASPECT],
	] as const) {
		test(`${name}: избушка в кадре, в верхней половине`, () => {
			const camera = new PerspectiveCamera(50, aspect, 0.1, 600);
			camera.position.copy(position);
			camera.lookAt(target);
			camera.updateMatrixWorld();
			const p = hut.clone().project(camera);
			expect(p.z).toBeLessThan(1);
			expect(Math.abs(p.x)).toBeLessThan(0.9);
			expect(p.y).toBeGreaterThan(0.05);
			expect(p.y).toBeLessThan(0.95);
		});
	}

	test("продолжает линию конца эпилога: та же сторона, выше — кадр не переворачивается", () => {
		const f = pathFrame(HOMECOMING.finalDistance);
		const fx = f.x + f.toHutZ * HOMECOMING.finalSide;
		const fz = f.z - f.toHutX * HOMECOMING.finalSide;
		// направление от избушки на камеру — то же, что в конце эпилога
		expect(position.x * fx + position.z * fz).toBeGreaterThan(0);
		expect(position.y).toBeGreaterThan(
			heightAt(fx, fz) + HOMECOMING.finalHeight,
		);
		// смотрит вниз
		expect(target.y).toBeLessThan(position.y);
	});
});
