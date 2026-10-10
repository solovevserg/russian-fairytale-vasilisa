/**
 * Готовит модели персонажей и избушки для сайта: упрощение геометрии,
 * сжатие текстур в WebP, Meshopt-сжатие. Исходники (скачанные с Sketchfab)
 * лежат в .cache/models — см. docs/assets.md.
 *
 *   bun run models:prepare
 */
import { mkdirSync } from "node:fs";
import { type Document, NodeIO, type Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
	dedup,
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

mkdirSync(OUT, { recursive: true });

// Избушка на курьих ножках (vet.doc, CC-BY 4.0)
{
	const doc = await io.read(`${SRC}/a_hut_on_chicken_legs.glb`);
	await doc.transform(weld());
	await finish(doc, "hut");
}

// Баба Яга (MAXDESIGN, CC-BY 4.0): анимация прорежена
{
	const doc = await io.read(`${SRC}/witch.glb`);
	await doc.transform(resample());
	await finish(doc, "baba-yaga");
}

// Василиса (akot777, CC-BY 4.0): сгенерирована без цвета и UV — упрощаем
// с ~487 тыс. до ~45 тыс. треугольников и раскрашиваем цветами вершин
{
	const doc = await io.read(`${SRC}/vasilisa/scene.gltf`);
	await doc.transform(
		weld(),
		simplify({ simplifier: MeshoptSimplifier, ratio: 0.09, error: 0.0008 }),
	);
	forEachPrimitive(doc, (prim) => paintVasilisa(doc, prim));
	await finish(doc, "vasilisa");
}
