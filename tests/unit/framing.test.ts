import { describe, expect, test } from "bun:test";
import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from "three";
import { HOME, heightAt } from "../../src/scene/terrain";
import {
	BABA_YAGA_FLIGHT,
	BABA_YAGA_STAND,
	KEYFRAMES,
	type SceneKeyframe,
} from "../../src/story/keyframes";

// Кадр сцены на десктопе: колонка 60% ширины, высота экрана
const ASPECT = 864 / 900;

function cameraOf(k: SceneKeyframe) {
	const camera = new PerspectiveCamera(k.camera.fov, ASPECT, 0.1, 600);
	camera.position.set(...k.camera.position);
	camera.lookAt(new Vector3(...k.camera.target));
	camera.updateMatrixWorld();
	return camera;
}

/** Точка видна в кадре (с небольшим полем от края). */
function inFrame(camera: PerspectiveCamera, point: Vector3, margin = 0.05) {
	const p = point.clone().project(camera);
	const limit = 1 - margin;
	return p.z < 1 && Math.abs(p.x) < limit && Math.abs(p.y) < limit;
}

function onGround(x: number, z: number, height: number) {
	return new Vector3(x, heightAt(x, z) + height, z);
}

const byId = (id: string) =>
	KEYFRAMES.find((k) => k.id === id) as SceneKeyframe;

describe("кадрирование ключевых кадров", () => {
	// в этих главах камера по раскадровке смотрит на избу или в небо
	const withoutHeroine = new Set(["black-rider", "baba-yaga"]);

	for (const k of KEYFRAMES) {
		const heroine = k.vasilisa;
		if (!heroine || withoutHeroine.has(k.id)) continue;
		test(`«${k.id}»: Василиса в кадре`, () => {
			const camera = cameraOf(k);
			const [x, z] = heroine.at;
			const height = heroine.pose === "sleep" ? 0.3 : 1.0;
			expect(
				inFrame(camera, onGround(x, z, height + (heroine.elevation ?? 0))),
			).toBe(true);
		});
	}

	test("«baba-yaga»: изба у края кадра, заход на посадку в кадре", () => {
		const camera = cameraOf(byId("baba-yaga"));
		const hut = new Vector3(0, heightAt(0, 0) + 4.5, 0).project(camera);
		expect(Math.max(Math.abs(hut.x), Math.abs(hut.y))).toBeGreaterThan(0.35);
		expect(Math.max(Math.abs(hut.x), Math.abs(hut.y))).toBeLessThan(1.05);

		const flight = new CatmullRomCurve3(
			BABA_YAGA_FLIGHT.map((p) => new Vector3(...p)),
			false,
			"centripetal",
		);
		const visible = Array.from({ length: 21 }, (_, i) =>
			flight.getPointAt((i / 20) * 0.6),
		).filter((p) => inFrame(camera, p, 0)).length;
		expect(visible / 21).toBeGreaterThan(0.6);
		// и место посадки у избы
		const landing = flight.getPointAt(1);
		expect(
			inFrame(camera, new Vector3(landing.x, landing.y + 0.8, landing.z)),
		).toBe(true);
	});

	test("«skull»: в кадре и Баба Яга, и Василиса", () => {
		const k = byId("skull");
		const camera = cameraOf(k);
		expect(
			inFrame(camera, onGround(BABA_YAGA_STAND.x, BABA_YAGA_STAND.z, 1.1)),
		).toBe(true);
		const heroine = k.vasilisa;
		expect(heroine).not.toBeNull();
		const [x, z] = heroine?.at ?? [0, 0];
		expect(inFrame(camera, onGround(x, z, 1.1))).toBe(true);
	});

	test("зачин и концовка: одна камера, в кадре изба и Василиса", () => {
		const prologue = byId("prologue");
		expect(byId("epilogue").camera).toEqual(prologue.camera);
		const camera = cameraOf(prologue);
		expect(inFrame(camera, onGround(HOME.x, HOME.z, 2.5))).toBe(true);
		for (const id of ["prologue", "epilogue"]) {
			const [x, z] = byId(id).vasilisa?.at ?? [0, 0];
			expect(inFrame(camera, onGround(x, z, 1))).toBe(true);
		}
	});
});
