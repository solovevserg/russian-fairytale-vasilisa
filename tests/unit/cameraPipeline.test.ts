import {describe, expect, test} from "bun:test";

import {Vector3} from "three";

import {
	type CameraContext,
	type CameraOutput,
	createCameraPipeline,
} from "../../src/scene/camera/pipeline";
import {heightAt} from "../../src/scene/terrain";
import {START_POSITION} from "../../src/story/readingPosition";
import {KEYFRAMES} from "../../src/story/scenes";
import {createSample, createTimeline} from "../../src/story/timeline";

const PARALLAX = {shift: 0.02, look: 0.5};

/** Один кадр конвейера в режиме instant (без сглаживания). */
function shoot(
	reading: Partial<CameraContext["reading"]>,
	pointer = {x: 0, y: 0},
) {
	const pipeline = createCameraPipeline(createTimeline(KEYFRAMES), PARALLAX);
	const sample = createSample();
	const out: CameraOutput = {
		position: new Vector3(),
		lookAt: new Vector3(),
		fov: 50,
	};
	const ctx: CameraContext = {
		delta: 1 / 60,
		now: 0,
		reading: {...START_POSITION, title: 0, edge: null, ...reading},
		instant: true,
		pointer,
	};
	pipeline.step(sample, ctx, out);
	return out;
}

describe("конвейер камеры", () => {
	test("на титуле камера дальше от Василисы, чем в прологе", () => {
		const prologue = shoot({title: 0});
		const title = shoot({title: 1, edge: "start"});
		expect(title.lookAt.distanceTo(title.position)).toBeGreaterThan(
			prologue.lookAt.distanceTo(prologue.position),
		);
	});

	test("на титрах камера высоко над избушкой и смотрит вниз", () => {
		const last = KEYFRAMES.length - 1;
		const out = shoot({
			progress: last,
			activeChapter: last,
			edge: "credits",
			credits: 1,
		});
		expect(out.position.y - heightAt(0, 0)).toBeGreaterThan(40);
		expect(out.lookAt.y).toBeLessThan(out.position.y);
	});

	test("камера не уходит под землю ни в одной главе", () => {
		for (let i = 0; i < KEYFRAMES.length; i++) {
			const out = shoot({progress: i, activeChapter: i}, {x: 1, y: 1});
			expect(out.position.y).toBeGreaterThan(
				heightAt(out.position.x, out.position.z),
			);
		}
	});

	test("указатель сдвигает камеру, а не только взгляд", () => {
		const still = shoot({progress: 2, activeChapter: 2});
		const moved = shoot({progress: 2, activeChapter: 2}, {x: 1, y: 0});
		expect(moved.position.distanceTo(still.position)).toBeGreaterThan(0);
	});
});
