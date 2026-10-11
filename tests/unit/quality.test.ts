import { describe, expect, test } from "bun:test";

import {
	type DeviceInfo,
	detectTier,
	settingsFor,
} from "../../src/scene/quality";

const desktop: DeviceInfo = {
	cores: 8,
	memory: 8,
	pixels: 1920 * 1080,
	touch: false,
};

describe("адаптивное качество", () => {
	test("мощный компьютер с дискретной видеокартой — высокое", () => {
		expect(
			detectTier({ ...desktop, gpu: "ANGLE (NVIDIA GeForce RTX 3060)" }),
		).toBe("high");
		expect(detectTier({ ...desktop, gpu: "Apple M2" })).toBe("high");
	});

	test("встроенная Intel и обычный телефон — среднее", () => {
		expect(
			detectTier({
				...desktop,
				gpu: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)",
			}),
		).toBe("medium");
		expect(
			detectTier({
				cores: 8,
				memory: 8,
				pixels: 1080 * 2400,
				touch: true,
				gpu: "Adreno (TM) 740",
			}),
		).toBe("medium");
	});

	test("экономия трафика, медленная сеть, слабая или программная графика — низкое", () => {
		expect(detectTier({ ...desktop, saveData: true })).toBe("low");
		expect(detectTier({ ...desktop, network: "2g" })).toBe("low");
		expect(detectTier({ ...desktop, gpu: "Google SwiftShader" })).toBe("low");
		expect(detectTier({ ...desktop, gpu: "Mali-G52" })).toBe("low");
		expect(
			detectTier({ cores: 4, memory: 2, pixels: 720 * 1600, touch: true }),
		).toBe("low");
	});

	test("«уменьшить движение» выключает ветер, остальное по уровню", () => {
		expect(settingsFor("high", true).wind).toBe(false);
		expect(settingsFor("high").wind).toBe(true);
		expect(settingsFor("low").shadows).toBe(false);
		expect(settingsFor("low").grass).toBeLessThan(settingsFor("medium").grass);
	});
});
