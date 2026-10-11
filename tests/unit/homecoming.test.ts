import { describe, expect, test } from "bun:test";

import { Vector3 } from "three";

import { HOME, heightAt, pathFrame } from "../../src/scene/terrain";
import {
	HOMECOMING,
	homecomingAt,
	homecomingCamera,
	homecomingNight,
	homecomingRoute,
} from "../../src/story/homecoming";

/** Полуразмеры сруба (модель house.glb, 7.1 × 8.6 м) в осях дома. */
const HALF = { x: 3.57, z: 4.28 };

/** Расстояние от точки до прямоугольника сруба, м (0 — внутри). */
function distanceToHouse(x: number, z: number): number {
	const h = HOME.heading;
	const dx = x - HOME.x;
	const dz = z - HOME.z;
	const lx = Math.abs(dx * Math.cos(h) - dz * Math.sin(h));
	const lz = Math.abs(dx * Math.sin(h) + dz * Math.cos(h));
	return Math.hypot(Math.max(lx - HALF.x, 0), Math.max(lz - HALF.z, 0));
}

describe("эпилог: дорога домой", () => {
	// там, где обычно заканчивается уход из «Черепа-светоча»
	const start = pathFrame(43);
	const route = homecomingRoute([start.x, start.z], 0.4);
	const total = route.length / HOMECOMING.speed;

	test("идёт с того места, где стояла, — без телепорта", () => {
		const p = homecomingAt(route, 0);
		expect(Math.hypot(p.x - start.x, p.z - start.z)).toBeLessThan(0.01);
		expect(p.heading).toBeCloseTo(0.4, 5);
		// и шагает ровно, без рывков
		let prev = p;
		for (let t = 0.1; t <= total; t += 0.1) {
			const q = homecomingAt(route, t);
			expect(Math.hypot(q.x - prev.x, q.z - prev.z)).toBeLessThan(0.2);
			prev = q;
		}
	});

	test("обходит избу кругом, не задевая сруб", () => {
		const aroundTime = route.aroundStart / HOMECOMING.speed;
		let angle = 0;
		let prevAngle: number | null = null;
		for (let t = aroundTime; t <= total; t += 0.1) {
			const p = homecomingAt(route, t);
			// под конец подходит к крыльцу — туда, где стоит в прологе
			const approach = t > total - 4;
			expect(distanceToHouse(p.x, p.z)).toBeGreaterThan(approach ? 0.4 : 0.8);
			const a = Math.atan2(p.z - HOME.z, p.x - HOME.x);
			if (prevAngle !== null)
				angle += Math.atan2(Math.sin(a - prevAngle), Math.cos(a - prevAngle));
			prevAngle = a;
		}
		expect(Math.abs(angle)).toBeGreaterThan(Math.PI * 1.9);
	});

	test("в конце стоит лицом к дому", () => {
		const p = homecomingAt(route, total + 5);
		const toHouse = Math.atan2(HOME.x - p.x, HOME.z - p.z);
		expect(
			Math.abs(
				Math.atan2(
					Math.sin(p.heading - toHouse),
					Math.cos(p.heading - toHouse),
				),
			),
		).toBeLessThan(0.05);
	});

	test("камера: сначала рядом с ней, в конце — высоко и смотрит на избушку", () => {
		const position = new Vector3();
		const target = new Vector3();
		homecomingCamera(route, 0, position, target);
		expect(Math.hypot(position.x - start.x, position.z - start.z)).toBeLessThan(
			8,
		);
		expect(position.y - heightAt(position.x, position.z)).toBeLessThan(3);

		homecomingCamera(route, total + 30, position, target);
		expect(position.y - heightAt(position.x, position.z)).toBeGreaterThan(15);
		expect(
			target.distanceTo(new Vector3(...HOMECOMING.finalTarget)),
		).toBeLessThan(0.01);
	});

	test("камера движется плавно", () => {
		const a = new Vector3();
		const b = new Vector3();
		const target = new Vector3();
		homecomingCamera(route, 0, a, target);
		for (let t = 0.05; t < total + 20; t += 0.05) {
			homecomingCamera(route, t, b, target);
			expect(b.distanceTo(a)).toBeLessThan(0.35);
			a.copy(b);
		}
	});

	test("ночь опускается вместе с полётом камеры к избушке", () => {
		expect(homecomingNight(route, 0)).toBe(0);
		expect(homecomingNight(route, total + 30)).toBe(1);
	});
});
