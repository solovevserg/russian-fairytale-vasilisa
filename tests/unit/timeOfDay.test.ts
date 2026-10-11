import {describe, expect, test} from "bun:test";

import {
	moonDirection,
	paletteAt,
	sunDirection,
} from "../../src/scene/sky/timeOfDay";

describe("timeOfDay", () => {
	test("солнце над горизонтом днём и под ним ночью", () => {
		expect(sunDirection(12).y).toBeGreaterThan(0.5);
		expect(sunDirection(0).y).toBeLessThan(-0.5);
		expect(Math.abs(sunDirection(6).y)).toBeLessThan(0.01);
	});

	test("луна ночью над горизонтом", () => {
		expect(moonDirection(0).y).toBeGreaterThan(0.2);
	});

	test("палитра непрерывна через полночь", () => {
		expect(paletteAt(23.99).zenith).toBe(paletteAt(0).zenith);
		expect(paletteAt(24)).toEqual(paletteAt(0));
	});

	test("ночь тёмная, день — нет", () => {
		expect(paletteAt(1).night).toBe(1);
		expect(paletteAt(13).night).toBe(0);
		expect(paletteAt(13).sunIntensity).toBeGreaterThan(
			paletteAt(1).sunIntensity,
		);
	});
});
