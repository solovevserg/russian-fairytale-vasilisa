/**
 * Процедурная раскраска модели Василисы цветами вершин: у исходной
 * сгенерированной модели нет ни текстур, ни UV. Зоны определяются по мировым
 * координатам (Y вверх, лицом к +Z, веточка в руке на +X, рушник на -X).
 */
import type { Document, mat4, Node, Primitive } from "@gltf-transform/core";

type RGB = [number, number, number];

/** Цвета в sRGB, пересчитываются в линейные (glTF хранит COLOR_0 линейным). */
const PALETTE = {
	sarafan: hex("#9e2219"),
	trim: hex("#c9952f"),
	blouse: hex("#ece4d2"),
	embroidery: hex("#b5281c"),
	skin: hex("#e7bfa0"),
	blush: hex("#e3a08c"),
	hair: hex("#7a4f24"),
	hairDark: hex("#4e3016"),
	// платок — не кроваво-красный, а соломенно-золотой, с красной каймой у лица
	scarf: hex("#d8bd84"),
	scarfBorder: hex("#a8321f"),
	// изумрудная вышивка по подолу (палитра орнамента сайта)
	hemStitch: hex("#2f5d50"),
	towel: hex("#f1ebdd"),
	leaf: hex("#4f7a36"),
	stem: hex("#6b4a2a"),
};

function hex(value: string): RGB {
	const n = Number.parseInt(value.slice(1), 16);
	const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
	return srgb.map((c) =>
		c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
	) as RGB;
}

interface Bounds {
	min: [number, number, number];
	max: [number, number, number];
}

/**
 * Цвет зоны. h — высота 0..1 от подола; x, z — мировые координаты модели
 * (ось фигуры около x = 0.1; веточка в правой руке на +X, рушник на −X;
 * лицо смотрит в +Z). Границы сняты с ортографических видов с сеткой.
 */
export function zoneColor(h: number, x: number, z: number): RGB {
	// веточка и кисть правой руки
	if (x > 0.29 && h > 0.73)
		return h > 0.79 || x > 0.36 ? PALETTE.leaf : PALETTE.stem;
	// кисть держит веточку перед собой; сзади на этой высоте — пышный рукав
	if (x > 0.33 && h > 0.66 && h < 0.75 && z > 0.02) return PALETTE.skin;
	// рушник и левая рука (предплечье открыто)
	if (x < -0.38 && h < 0.5)
		return h < 0.27 ? PALETTE.embroidery : PALETTE.towel;
	if (x < -0.27 && h < 0.58 && h > 0.45) return PALETTE.skin;
	// голова: лицо спереди, остальное — платок
	if (h > 0.855) {
		const face = z > 0.04 && x > 0.02 && x < 0.175 && h < 0.965;
		if (face) {
			// румянец на щеках
			const cheek =
				h > 0.882 && h < 0.912 && Math.abs(Math.abs(x - 0.1) - 0.05) < 0.018;
			return cheek ? PALETTE.blush : PALETTE.skin;
		}
		// кайма платка вокруг лица
		const nearFace = z > 0.02 && x > 0.005 && x < 0.19 && h < 0.972 && h > 0.86;
		return nearFace ? PALETTE.scarfBorder : PALETTE.scarf;
	}
	// русая коса — спереди по правой стороне груди, от шеи вниз; пряди
	// перевиваются наискосок — светлые и тёмные полосы
	if (x > 0.15 && x < 0.225 && h > 0.66 && h < 0.85 && z > 0) {
		const strand = Math.floor((h * 90 + (x - 0.15) * 160) % 3);
		return strand === 0 ? PALETTE.hairDark : PALETTE.hair;
	}
	// шея и ворот рубахи (ворот — с золотой полосой)
	if (h > 0.81) {
		if (z > 0.03 && x > 0.04 && x < 0.16 && h > 0.83) return PALETTE.skin;
		return h < 0.825 ? PALETTE.trim : PALETTE.blouse;
	}
	// рукава рубахи; манжеты с вышивкой
	if (x < -0.05 && h > 0.55)
		return x < -0.2 && h < 0.63 ? PALETTE.embroidery : PALETTE.blouse;
	if (x > 0.26 && h > 0.56)
		return h < 0.62 ? PALETTE.embroidery : PALETTE.blouse;
	// рубаха над квадратным вырезом сарафана
	if (h > 0.76) return PALETTE.blouse;
	// пояс (свисающие концы и подол остаются цвета сарафана: по координатам
	// они неотделимы от юбки, и полосы выходили рваными)
	if (h > 0.6 && h < 0.63) return PALETTE.trim;
	// подол: золотая кайма и над ней вышитая полоса
	if (h < 0.035) return PALETTE.trim;
	if (h > 0.055 && h < 0.07) return PALETTE.hemStitch;
	if (h > 0.07 && h < 0.078) return PALETTE.trim;
	return PALETTE.sarafan;
}

function transformPoint(m: mat4, p: number[]): [number, number, number] {
	const [x, y, z] = p;
	return [
		m[0] * x + m[4] * y + m[8] * z + m[12],
		m[1] * x + m[5] * y + m[9] * z + m[13],
		m[2] * x + m[6] * y + m[10] * z + m[14],
	];
}

/** Мировая матрица узла, к которому привязан примитив. */
function worldMatrixOf(doc: Document, prim: Primitive): mat4 {
	const node = doc
		.getRoot()
		.listNodes()
		.find((n: Node) => n.getMesh()?.listPrimitives().includes(prim));
	return (node?.getWorldMatrix() ?? [
		1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
	]) as mat4;
}

function boundsOf(doc: Document): Bounds {
	const min: [number, number, number] = [Infinity, Infinity, Infinity];
	const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
	for (const mesh of doc.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			const m = worldMatrixOf(doc, prim);
			const pos = prim.getAttribute("POSITION");
			if (!pos) continue;
			const p: number[] = [];
			for (let i = 0; i < pos.getCount(); i++) {
				const w = transformPoint(m, pos.getElement(i, p));
				for (let a = 0; a < 3; a++) {
					min[a] = Math.min(min[a], w[a]);
					max[a] = Math.max(max[a], w[a]);
				}
			}
		}
	}
	return { min, max };
}

let cachedBounds: Bounds | null = null;

/**
 * Веточка в правой руке: по сюжету Василиса несёт куколку (а в эпилоге —
 * череп-светоч), поэтому ветку из модели вырезаем, а предмет в руку
 * подставляет сцена.
 */
function isBranch(h: number, x: number): boolean {
	return x > 0.29 && h > 0.745;
}

/** Убирает треугольники, для которых `drop(a, b, c)` истинно (по индексам вершин). */
function removeTriangles(
	prim: Primitive,
	drop: (a: number, b: number, c: number) => boolean,
) {
	const indices = prim.getIndices();
	if (!indices) return;
	const src = indices.getArray();
	if (!src) return;
	const kept: number[] = [];
	for (let i = 0; i < src.length; i += 3) {
		if (!drop(src[i], src[i + 1], src[i + 2]))
			kept.push(src[i], src[i + 1], src[i + 2]);
	}
	indices.setArray(new Uint32Array(kept));
}

/** Добавляет примитиву COLOR_0 по зонам; материал начинает учитывать цвета вершин. */
export function paintVasilisa(doc: Document, prim: Primitive) {
	cachedBounds ??= boundsOf(doc);
	const { min, max } = cachedBounds;
	const m = worldMatrixOf(doc, prim);
	const pos = prim.getAttribute("POSITION");
	if (!pos) return;
	const count = pos.getCount();
	const colors = new Float32Array(count * 3);
	const branch = new Uint8Array(count);
	const p: number[] = [];
	for (let i = 0; i < count; i++) {
		const [x, y, z] = transformPoint(m, pos.getElement(i, p));
		const h = (y - min[1]) / (max[1] - min[1]);
		colors.set(zoneColor(h, x, z), i * 3);
		branch[i] = isBranch(h, x) ? 1 : 0;
	}
	removeTriangles(prim, (a, b, c) => branch[a] + branch[b] + branch[c] >= 2);
	const accessor = doc
		.createAccessor()
		.setType("VEC3")
		.setArray(colors)
		.setBuffer(pos.getBuffer());
	prim.setAttribute("COLOR_0", accessor);
	prim
		.getMaterial()
		?.setBaseColorFactor([1, 1, 1, 1])
		.setRoughnessFactor(0.85)
		.setMetallicFactor(0);
}
