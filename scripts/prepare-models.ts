/**
 * Готовит модели персонажей и избушки для сайта: упрощение геометрии,
 * сжатие текстур в WebP, Meshopt-сжатие. Исходники (скачанные с Sketchfab)
 * лежат в .cache/models — см. docs/assets.md.
 *
 *   bun run models:prepare            — все модели
 *   bun run models:prepare skull house — только перечисленные
 *
 * Для телефонов (quality.lightAssets) у тяжёлых моделей есть облегчённые
 * копии `<имя>-mobile.glb`: сетка проще, текстуры меньше.
 */
import {mkdirSync} from "node:fs";

import {type Document, NodeIO, type Primitive} from "@gltf-transform/core";
import {ALL_EXTENSIONS} from "@gltf-transform/extensions";
import {
	center,
	dedup,
	flatten,
	getBounds,
	join,
	meshopt,
	prune,
	resample,
	simplify,
	textureCompress,
	unweld,
	weld,
} from "@gltf-transform/functions";
import {MeshoptEncoder, MeshoptSimplifier} from "meshoptimizer";
import sharp from "sharp";

import {paintVasilisa} from "./vasilisaPaint";

const SRC = ".cache/models";
const OUT = "public/models";

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({
		"meshopt.encoder": MeshoptEncoder,
	});

/** Наибольшая сторона текстур: обычная и для облегчённых копий. */
const TEXTURE_SIZE = 1024;
const MOBILE_TEXTURE_SIZE = 512;

async function finish(doc: Document, name: string, textureSize = TEXTURE_SIZE) {
	await doc.transform(
		dedup(),
		prune(),
		textureCompress({
			encoder: sharp,
			targetFormat: "webp",
			resize: [textureSize, textureSize],
			quality: 82,
		}),
		meshopt({encoder: MeshoptEncoder, level: "medium"}),
	);
	await io.write(`${OUT}/${name}.glb`, doc);
	console.log(`✓ ${name}.glb`);
}

function forEachPrimitive(doc: Document, fn: (prim: Primitive) => void) {
	for (const mesh of doc.getRoot().listMeshes())
		for (const prim of mesh.listPrimitives()) fn(prim);
}

/**
 * Ставит модель на землю в начале координат и масштабирует до высоты
 * `height` м; мелкие узлы сливаются в меши по материалам.
 */
async function normalize(doc: Document, height: number) {
	const scene = doc.getRoot().listScenes()[0];
	await doc.transform(center({pivot: "below"}));
	const b = getBounds(scene);
	const s = height / (b.max[1] - b.min[1]);
	const wrapper = doc.createNode("root").setScale([s, s, s]);
	for (const child of scene.listChildren()) {
		scene.removeChild(child);
		wrapper.addChild(child);
	}
	scene.addChild(wrapper);
	await doc.transform(flatten(), join(), weld());
}

/** Перекрашивает материал по имени (низкополигональные модели без текстур). */
function recolor(
	doc: Document,
	colors: Record<string, [number, number, number]>,
) {
	for (const m of doc.getRoot().listMaterials()) {
		const c = colors[m.getName()];
		if (c) m.setBaseColorFactor([...c, 1]);
	}
}

const only = process.argv.slice(2);
const wanted = (name: string) => only.length === 0 || only.includes(name);

mkdirSync(OUT, {recursive: true});

// Избушка на курьих ножках (vet.doc, CC-BY 4.0); для телефонов — текстуры 512
if (wanted("hut")) {
	for (const [name, size] of [
		["hut", TEXTURE_SIZE],
		["hut-mobile", MOBILE_TEXTURE_SIZE],
	] as const) {
		const doc = await io.read(`${SRC}/a_hut_on_chicken_legs.glb`);
		await doc.transform(weld());
		await finish(doc, name, size);
	}
}

// Баба Яга (MAXDESIGN, CC-BY 4.0): анимация прорежена
if (wanted("baba-yaga")) {
	const doc = await io.read(`${SRC}/witch.glb`);
	await doc.transform(resample());
	await finish(doc, "baba-yaga");
}

// Василиса (akot777, CC-BY 4.0): сгенерирована без цвета и UV — упрощаем
// с ~487 тыс. до ~45 тыс. треугольников (для телефонов — до ~20 тыс.) и
// раскрашиваем цветами вершин
if (wanted("vasilisa")) {
	for (const [name, ratio, error] of [
		["vasilisa", 0.11, 0.0007],
		["vasilisa-mobile", 0.045, 0.002],
	] as const) {
		const doc = await io.read(`${SRC}/vasilisa/scene.gltf`);
		await doc.transform(
			weld(),
			simplify({simplifier: MeshoptSimplifier, ratio, error}),
			// у каждого треугольника свои вершины — цвет зоны на треугольник целиком
			unweld(),
		);
		forEachPrimitive(doc, (prim) => paintVasilisa(doc, prim));
		await finish(doc, name);
	}
}

// Череп (Quaternius, CC0): для частокола и черепа-светоча, высота 0,25 м
if (wanted("skull")) {
	const doc = await io.read(`${SRC}/skull-quaternius.glb`);
	await normalize(doc, 0.25);
	recolor(doc, {Bone: [0.72, 0.66, 0.52]});
	await finish(doc, "skull");
}

// Изба Василисы — «Cabin» (Poly by Google, CC-BY 3.0): сруб, высота 5 м;
// розоватые брёвна и белая кровля — в цвет потемневшего дерева
if (wanted("house")) {
	const doc = await io.read(`${SRC}/cabin-poly-google.glb`);
	await normalize(doc, 5);
	recolor(doc, {
		"02___Default": [0.36, 0.25, 0.16],
		"03___Default": [0.2, 0.12, 0.08],
	});
	await finish(doc, "house");
}

// Птица в полёте — «Bird» (Poly by Google, CC-BY 3.0): крылья раскинуты.
// В исходнике размах — по Y, верх — по Z, тело — по X; переводим в оси сцены
// (размах — X, верх — Y, вперёд — Z), размах 1.2 м, центр — в теле.
if (wanted("bird")) {
	const doc = await io.read(`${SRC}/bird-poly-google.glb`);
	await doc.transform(flatten(), join(), weld());
	const SPAN = 1.2;
	// границы — по самим вершинам (узлы ниже сбрасываются в единичные)
	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];
	for (const mesh of doc.getRoot().listMeshes())
		for (const prim of mesh.listPrimitives()) {
			const a = prim.getAttribute("POSITION");
			const v: number[] = [];
			for (let i = 0; i < (a?.getCount() ?? 0); i++) {
				a?.getElement(i, v);
				for (let k = 0; k < 3; k++) {
					min[k] = Math.min(min[k], v[k]);
					max[k] = Math.max(max[k], v[k]);
				}
			}
		}
	const s = SPAN / (max[1] - min[1]);
	const c = min.map((v, i) => (v + max[i]) / 2);
	for (const node of doc.getRoot().listNodes()) {
		node
			.setTranslation([0, 0, 0])
			.setRotation([0, 0, 0, 1])
			.setScale([1, 1, 1]);
	}
	for (const mesh of doc.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			for (const name of ["POSITION", "NORMAL"] as const) {
				const a = prim.getAttribute(name);
				if (!a) continue;
				const v: number[] = [];
				for (let i = 0; i < a.getCount(); i++) {
					const [x, y, z] = a.getElement(i, v);
					// (x, y, z) → (y, z, x): циклическая перестановка — поворот
					a.setElement(
						i,
						name === "POSITION"
							? [(y - c[1]) * s, (z - c[2]) * s, (x - c[0]) * s]
							: [y, z, x],
					);
				}
			}
		}
	}
	recolor(doc, {blinn3SG: [0.03, 0.028, 0.026]});
	await finish(doc, "bird");
}
