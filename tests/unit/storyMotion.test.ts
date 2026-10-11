import { describe, expect, test } from "bun:test";

import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from "three";

import { heightAt } from "../../src/scene/terrain";
import {
	BABA_YAGA_FLIGHT,
	KEYFRAMES,
	RIDER_PATHS,
} from "../../src/story/keyframes";
import { delayedTimeProgress, RIDER_LIGHT } from "../../src/story/lightDelay";

const index = (id: string) => KEYFRAMES.findIndex((k) => k.id === id);

describe("свет и всадники", () => {
	const white = index("white-rider");
	const black = index("black-rider");
	const ride = RIDER_PATHS.white.duration;

	test("белый: светает вместе со скачкой", () => {
		expect(delayedTimeProgress(white, 0, { white: 0 })).toBe(white - 1);
		const mid = delayedTimeProgress(white, ride / 2, { white: 0 });
		expect(mid).toBeGreaterThan(white - 1);
		expect(mid).toBeLessThan(white);
		expect(delayedTimeProgress(white, ride, { white: 0 })).toBe(white);
	});

	test("красный: время суток не меняется", () => {
		const red = index("red-rider");
		expect(KEYFRAMES[red].timeOfDay).toBe(KEYFRAMES[red - 1].timeOfDay);
	});

	test("чёрный: ночь опускается после скачки", () => {
		const blackRide = RIDER_PATHS.black.duration;
		const { after, fade } = RIDER_LIGHT.black;
		expect(
			delayedTimeProgress(black, blackRide * after - 0.1, { black: 0 }),
		).toBe(black - 1);
		expect(
			delayedTimeProgress(black, blackRide * after + fade, { black: 0 }),
		).toBe(black);
	});

	test("всадник не стартовал — свет ждёт только при подходе к главе", () => {
		expect(delayedTimeProgress(white - 0.5, 0, {})).toBe(white - 1);
		// после главы со всадником свет не откатывается к предыдущей (дневной) главе
		expect(delayedTimeProgress(black + 0.3, 0, {})).toBe(black + 0.3);
	});

	test("в главах без всадников задержки нет", () => {
		const tasks = index("tasks");
		expect(delayedTimeProgress(tasks, 0, {})).toBe(tasks);
	});
});

function cameraOf(id: string) {
	const k = KEYFRAMES[index(id)];
	const camera = new PerspectiveCamera(k.camera.fov, 864 / 900, 0.1, 600);
	camera.position.set(...k.camera.position);
	camera.lookAt(new Vector3(...k.camera.target));
	camera.updateMatrixWorld();
	return camera;
}

describe("траектории", () => {
	test("чёрный всадник проносится через кадр своей главы", () => {
		const camera = cameraOf("black-rider");
		const curve = new CatmullRomCurve3(
			RIDER_PATHS.black.points.map((p) => new Vector3(...p)),
		);
		const inFrame = Array.from({ length: 40 }, (_, i) =>
			curve.getPointAt(i / 39),
		).filter((p) => {
			const q = new Vector3(p.x, heightAt(p.x, p.z) + 1.5, p.z).project(camera);
			return q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1;
		});
		expect(inFrame.length).toBeGreaterThan(10);
	});

	test("Баба Яга пролетает рядом с камерой и садится у избушки", () => {
		const camera = cameraOf("baba-yaga").position;
		const flight = new CatmullRomCurve3(
			BABA_YAGA_FLIGHT.map((p) => new Vector3(...p)),
			false,
			"centripetal",
		);
		const closest = Math.min(
			...Array.from({ length: 100 }, (_, i) =>
				flight.getPointAt(i / 99).distanceTo(camera),
			),
		);
		expect(closest).toBeLessThan(5);
		const end = flight.getPointAt(1);
		expect(Math.hypot(end.x, end.z)).toBeLessThan(6);
		expect(end.y).toBeLessThan(0.5);
	});
});
