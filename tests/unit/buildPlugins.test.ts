import {describe, expect, test} from "bun:test";

import {EZ_TREE_TEXTURES} from "../../scripts/vite/ezTreeTextures";
import {squeezeGlsl} from "../../scripts/vite/glslWhitespace";
import {replaceGlslLine} from "../../src/lib/glsl";
import {BUSH_SPECS, TREE_VARIANTS} from "../../src/scene/forest/variants";

describe("ezTreeTextures", () => {
	test("сборка оставляет текстуры всех пород, что есть в пресетах леса и кустов", async () => {
		// ez-tree при импорте создаёт <img> для текстур — в тестах DOM нет
		Object.assign(globalThis, {
			document: {
				createElementNS: () => ({
					addEventListener() {},
					removeEventListener() {},
					style: {},
				}),
			},
		});
		const {TreePreset} = await import("@dgreenheck/ez-tree");
		const bark = new Set<string>(EZ_TREE_TEXTURES.bark);
		const leaves = new Set<string>(EZ_TREE_TEXTURES.leaves);
		for (const spec of [...TREE_VARIANTS, ...BUSH_SPECS]) {
			const preset = TreePreset[spec.preset];
			expect(bark.has(spec.barkType ?? preset.bark.type)).toBe(true);
			expect(leaves.has(preset.leaves.type)).toBe(true);
		}
	});
});

describe("squeezeGlsl", () => {
	test("убирает комментарии, отступы, пустые строки и пробелы вокруг знаков", () => {
		const source = [
			"// заголовок",
			"\tvec3 c = mix( a, b, t ) * 0.5; // смесь",
			"",
			"\t/* блок */",
			"\tif ( x > 1.0 ) { y = -x; }",
		].join("\n");
		expect(squeezeGlsl(source)).toBe(
			// перевод строки после комментария в начале куска остаётся (край куска)
			"\nvec3 c=mix(a,b,t)*0.5;\nif(x>1.0){y=-x;}",
		);
	});

	test("понимает экранированные переводы строк и табуляции (так их пишет минификатор)", () => {
		expect(squeezeGlsl(String.raw`#ifdef A\n\t\tfloat x = 1.0;\n\n\t}`)).toBe(
			String.raw`#ifdef A\nfloat x=1.0;\n}`,
		);
	});

	test("не склеивает знаки в другой оператор", () => {
		expect(squeezeGlsl("a = b - -c; d = e < =f; g = h / /i;")).toBe(
			"a=b- -c;d=e< =f;g=h/ /i;",
		);
	});

	test("в директивах сжимает только повторяющиеся пробелы", () => {
		expect(squeezeGlsl("#define X   ( a + b )\n#include <common>")).toBe(
			"#define X ( a + b )\n#include <common>",
		);
	});

	test("на краях куска сохраняет пробел и перевод строки (там вставка или склейка +)", () => {
		// так минификатор пишет '#define ' + name и '#define SHADER_TYPE ' + type
		expect(squeezeGlsl("#define SHADER_TYPE ")).toBe("#define SHADER_TYPE ");
		expect(squeezeGlsl(" ")).toBe(" ");
		expect(squeezeGlsl("\tuniform float ")).toBe(" uniform float ");
		expect(squeezeGlsl(" = 1.0;")).toBe(" =1.0;");
		expect(squeezeGlsl("\n#include <common>")).toBe("\n#include <common>");
		// комментарий, разорванный вставкой, не превращается в код
		expect(squeezeGlsl("x = 1; // a ")).toBe("x=1;//a ");
	});
});

describe("replaceGlslLine", () => {
	const line = "vec4 c = texture2D( map, vMapUv );";

	test("находит строку и в исходном, и в сжатом шейдере", () => {
		for (const chunk of [
			`#ifdef A
	${line}
#endif`,
			squeezeGlsl(`#ifdef A
	${line}
#endif`),
		]) {
			expect(replaceGlslLine(chunk, line, "X")).toBe(
				chunk.replace(/vec4.*;/, "X"),
			);
		}
	});

	test("громко падает, если строки нет", () => {
		expect(() => replaceGlslLine("void main(){}", line, "X")).toThrow();
	});
});
