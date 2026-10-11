/**
 * Готовит модели персонажей и избушки для сайта: упрощение геометрии,
 * сжатие текстур в WebP, Meshopt-сжатие. Исходники (скачанные с Sketchfab)
 * лежат в .cache/models — см. docs/assets.md.
 *
 *   bun run models:prepare            — все модели
 *   bun run models:prepare skull house — только перечисленные
 */
import { mkdirSync } from "node:fs";
import { type Document, NodeIO, type Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
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
	weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { paintVasilisa } from "./vasilisaPaint";

const SRC = ".cache/models";
const OUT = "public/models";

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({
		"meshopt.encoder": MeshoptEncoder,
	});

async function finish(doc: Document, name: string) {
	await doc.transform(
		dedup(),
		prune(),
		textureCompress({
			encoder: sharp,
			targetFormat: "webp",
			resize: [1024, 1024],
			quality: 82,
		}),
		meshopt({ encoder: MeshoptEncoder, level: "medium" }),
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
	await doc.transform(center({ pivot: "below" }));
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

mkdirSync(OUT, { recursive: true });

// Избушка на курьих ножках (vet.doc, CC-BY 4.0)
if (wanted("hut")) {
	const doc = await io.read(`${SRC}/a_hut_on_chicken_legs.glb`);
	await doc.transform(weld());
	await finish(doc, "hut");
}

// Баба Яга (MAXDESIGN, CC-BY 4.0): анимация прорежена
if (wanted("baba-yaga")) {
	const doc = await io.read(`${SRC}/witch.glb`);
	await doc.transform(resample());
	await finish(doc, "baba-yaga");
}

// Василиса (akot777, CC-BY 4.0): сгенерирована без цвета и UV — упрощаем
// с ~487 тыс. до ~45 тыс. треугольников и раскрашиваем цветами вершин
if (wanted("vasilisa")) {
	const doc = await io.read(`${SRC}/vasilisa/scene.gltf`);
	await doc.transform(
		weld(),
		simplify({ simplifier: MeshoptSimplifier, ratio: 0.09, error: 0.0008 }),
	);
	forEachPrimitive(doc, (prim) => paintVasilisa(doc, prim));
	await finish(doc, "vasilisa");
}

// Череп (Quaternius, CC0): для частокола и черепа-светоча, высота 0,25 м
if (wanted("skull")) {
	const doc = await io.read(`${SRC}/skull-quaternius.glb`);
	await normalize(doc, 0.25);
	recolor(doc, { Bone: [0.72, 0.66, 0.52] });
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
