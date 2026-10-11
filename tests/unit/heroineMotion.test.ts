import {describe, expect, test} from "bun:test";

import {createHeroineMotion} from "../../src/story/heroineMotion";
import {SKULL_HANDOVER} from "../../src/story/places";
import {KEYFRAMES} from "../../src/story/scenes";
import {createSample, createTimeline} from "../../src/story/timeline";

const timeline = createTimeline(KEYFRAMES);
const index = (id: string) => KEYFRAMES.findIndex((k) => k.id === id);
/** Кадр героини, стоящей на главе `id`. */
const at = (id: string) => timeline.sample(index(id), createSample()).vasilisa;

describe("движение героини", () => {
	test("нет в кадре — нет позы", () => {
		const motion = createHeroineMotion(true);
		expect(
			motion.step({...at("prologue"), visible: false}, 0, 0.016, true),
		).toBeNull();
	});

	test("«Череп-светоч»: стоит у Бабы Яги, потом уходит по тропе — по часам", () => {
		const motion = createHeroineMotion(true);
		const v = at("skull");
		const start = motion.step(v, 10, 0.016, false);
		const later = motion.step(v, 30, 0.016, false);
		expect(start?.x).toBeCloseTo(SKULL_HANDOVER.vasilisa[0], 1);
		expect(
			Math.hypot(
				(later?.x ?? 0) - SKULL_HANDOVER.vasilisa[0],
				(later?.z ?? 0) - SKULL_HANDOVER.vasilisa[1],
			),
		).toBeGreaterThan(5);
	});

	test("«Огонь погас»: дойдя до кадра, медленно идёт дальше к избушке", () => {
		const motion = createHeroineMotion(true);
		const v = at("fire");
		const first = motion.step(v, 0, 0.016, false);
		const after = motion.step(v, 20, 0.016, false);
		expect(first && after).toBeTruthy();
		// к избушке — ближе к центру поляны
		expect(Math.hypot(after?.x ?? 0, after?.z ?? 0)).toBeLessThan(
			Math.hypot(first?.x ?? 0, first?.z ?? 0),
		);
	});

	test("зачин — только при открытии на прологе: не на прологе — сразу по таймлайну", () => {
		const motion = createHeroineMotion(false);
		const v = at("prologue");
		const pose = motion.step(v, 0, 0.016, false);
		expect(pose?.x).toBeCloseTo(v.x);
		expect(pose?.z).toBeCloseTo(v.z);
	});

	test("прервали «идёт дальше» — к таймлайну не скачком, а плавно", () => {
		const motion = createHeroineMotion(true);
		const fire = at("fire");
		motion.step(fire, 0, 0.016, false);
		const walked = motion.step(fire, 6, 0.016, false);
		// тот же кадр, но без onward (листнули): таймлайн — там, где кадр,
		// а героиня за кадр сдвигается к нему лишь на малую долю разрыва
		const pose = motion.step({...fire, onward: 0}, 6.02, 0.016, false);
		const gap = Math.hypot(
			fire.x - (walked?.x ?? 0),
			fire.z - (walked?.z ?? 0),
		);
		const moved = Math.hypot(
			(pose?.x ?? 0) - (walked?.x ?? 0),
			(pose?.z ?? 0) - (walked?.z ?? 0),
		);
		expect(gap).toBeGreaterThan(0.5);
		expect(moved).toBeLessThan(gap * 0.1);
	});
});
