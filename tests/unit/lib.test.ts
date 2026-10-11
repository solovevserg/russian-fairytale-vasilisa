import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	damp,
	dampFactor,
	frameDt,
	MAX_FRAME_DT,
	ramp,
} from "../../src/lib/damp";
import {
	clamp,
	clamp01,
	inverseLerp,
	lerp,
	lerpAngle,
	smooth01,
	smoothstep,
	wrapAngle,
} from "../../src/lib/math";
import { toRoman } from "../../src/lib/roman";

describe("lib/math", () => {
	test("clamp и clamp01", () => {
		expect(clamp(5, 0, 1)).toBe(1);
		expect(clamp(-5, 0, 1)).toBe(0);
		expect(clamp(0.3, 0, 1)).toBe(0.3);
		expect(clamp01(2)).toBe(1);
	});

	test("lerp и inverseLerp взаимно обратны", () => {
		expect(lerp(2, 6, 0.25)).toBe(3);
		expect(lerp(2, 6, 1.5)).toBe(8);
		expect(inverseLerp(2, 6, 3)).toBe(0.25);
		expect(inverseLerp(1, 1, 5)).toBe(0);
	});

	test("smoothstep: края, середина, монотонность, обратная ступенька", () => {
		expect(smoothstep(0, 10, -1)).toBe(0);
		expect(smoothstep(0, 10, 11)).toBe(1);
		expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5);
		expect(smoothstep(10, 0, 2)).toBeCloseTo(1 - smoothstep(0, 10, 2));
		let last = -1;
		for (let x = 0; x <= 1; x += 0.01) {
			const y = smooth01(x);
			expect(y).toBeGreaterThanOrEqual(last);
			last = y;
		}
	});

	test("углы: приведение и кратчайшая дуга", () => {
		expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
		expect(wrapAngle(-0.5)).toBeCloseTo(-0.5);
		// от 0.1 к 2π − 0.1 — через ноль, а не через полный оборот
		expect(lerpAngle(0.1, 2 * Math.PI - 0.1, 0.5)).toBeCloseTo(0);
		expect(lerpAngle(1, 2, 0.5)).toBeCloseTo(1.5);
	});
});

describe("lib/damp", () => {
	test("длинный кадр ограничен", () => {
		expect(frameDt(5)).toBe(MAX_FRAME_DT);
		expect(frameDt(0.016)).toBe(0.016);
		expect(dampFactor(2, 5)).toBe(dampFactor(2, MAX_FRAME_DT));
	});

	test("damp не зависит от частоты кадров", () => {
		let at30 = 0;
		let at120 = 0;
		for (let i = 0; i < 30; i++) at30 = damp(at30, 1, 2.5, 1 / 30);
		for (let i = 0; i < 120; i++) at120 = damp(at120, 1, 2.5, 1 / 120);
		expect(at30).toBeCloseTo(at120, 6);
		expect(at30).toBeCloseTo(1 - Math.exp(-2.5), 6);
	});

	test("ramp: вверх за upSeconds, вниз за downSeconds, в пределах 0..1", () => {
		let v = 0;
		for (let i = 0; i < 100; i++) v = ramp(v, true, 2, 0.5, 0.01);
		expect(v).toBeCloseTo(0.5);
		for (let i = 0; i < 25; i++) v = ramp(v, false, 2, 0.5, 0.01);
		expect(v).toBeCloseTo(0);
		expect(ramp(0, false, 2, 0.5, 0.1)).toBe(0);
		expect(ramp(1, true, 2, 0.5, 0.1)).toBe(1);
	});
});

describe("lib/roman", () => {
	test("римские числа", () => {
		expect([1, 4, 9, 10, 14, 40, 90, 1999].map(toRoman)).toEqual([
			"I",
			"IV",
			"IX",
			"X",
			"XIV",
			"XL",
			"XC",
			"MCMXCIX",
		]);
	});
});

describe("lib — без знания о проекте", () => {
	test("src/lib не импортирует сцену, историю, интерфейс", () => {
		const dir = join(import.meta.dir, "../../src/lib");
		for (const file of readdirSync(dir, { recursive: true }) as string[]) {
			if (!/\.tsx?$/.test(file)) continue;
			const code = readFileSync(join(dir, file), "utf8");
			for (const [, from] of code.matchAll(/from "([^"]+)"/g)) {
				expect(from).not.toMatch(/(story|scene|ui|i18n|audio|reader|state)\//);
			}
		}
	});
});
