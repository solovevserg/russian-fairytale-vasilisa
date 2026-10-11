import type {Plugin} from "vite";

/** Признаки GLSL: шаблонные строки без них не трогаем. */
const GLSL_MARKER = /gl_|#include|#ifdef|#define|uniform |varying |void main/;
/**
 * Перевод строки в тексте шаблонной строки — настоящий или экранированный
 * `\n` (минификатор пишет и так, и так).
 */
const LINE_BREAK = /(\n|\\n)/;
/** Знаки, вокруг которых пробел не нужен. */
const PUNCTUATION = "(){}[],;:?=+-*/%<>!&|^~.";
/** Пары знаков, которые без пробела склеятся в другой оператор или комментарий. */
const GLUED = new Set([
	"++",
	"--",
	"<<",
	">>",
	"<=",
	">=",
	"==",
	"!=",
	"&&",
	"||",
	"^^",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
	"//",
	"/*",
	"*/",
]);

function isPunctuation(char: string): boolean {
	return PUNCTUATION.includes(char);
}

/** Убирает пробелы вокруг знаков в строке кода (не директиве препроцессора). */
function squeezeLine(line: string): string {
	return line.replace(/ +/g, (spaces, offset: number) => {
		const before = line[offset - 1] ?? "";
		const after = line[offset + spaces.length] ?? "";
		if (!before || !after) return "";
		if (!isPunctuation(before) && !isPunctuation(after)) return " ";
		return GLUED.has(before + after) ? " " : "";
	});
}

/**
 * Сжимает текст шейдера — кусок шаблонной строки: убирает комментарии,
 * отступы, пустые строки и пробелы вокруг скобок и знаков операций.
 *
 * Что остаётся:
 * - переводы строк: ими заканчиваются директивы препроцессора;
 * - в директивах — одиночные пробелы: `#define X (a)` и `#define X(a)`
 *   значат разное;
 * - по пробелу и переводу строки на краях куска: рядом может стоять вставка
 *   `${…}` или склейка `+` — `#define ${name} ${value}`,
 *   `` `#define SHADER_TYPE ` + type ``, `` `${defines}` + `\n#include` ``.
 */
export function squeezeGlsl(source: string): string {
	const parts = source.replace(/\/\*[\s\S]*?\*\//g, "").split(LINE_BREAK);
	const last = parts.length - 1;
	let result = "";
	for (let i = 0; i <= last; i += 2) {
		const breakAfter = parts[i + 1] ?? "";
		let line = parts[i].replace(/\\t|\t/g, " ");
		// комментарий в конце куска может продолжаться после вставки — не трогаем
		if (i !== last) line = line.replace(/\/\/.*$/, "");
		const text = line.trim();
		const lead = i === 0 && line.startsWith(" ");
		const trail = i === last && line.endsWith(" ");
		if (!text) {
			if (lead || trail) result += " ";
			if (i === 0) result += breakAfter;
			continue;
		}
		const squeezed = text.startsWith("#")
			? text.replace(/ {2,}/g, " ")
			: squeezeLine(text);
		result += (lead ? " " : "") + squeezed + (trail ? " " : "") + breakAfter;
	}
	return result;
}

interface Range {
	start: number;
	end: number;
}

interface Node extends Range {
	type: string;
	value?: unknown;
}

/**
 * Тексты строк в AST (ESTree), похожие на GLSL: куски шаблонных строк и
 * обычные строковые литералы (так шейдеры записаны в сборке three.js) —
 * как диапазоны в коде без кавычек.
 */
function glslRanges(root: unknown, code: string): Range[] {
	const found: Range[] = [];
	const stack = [root];
	while (stack.length > 0) {
		const node = stack.pop();
		if (!node || typeof node !== "object") continue;
		if (Array.isArray(node)) {
			stack.push(...node);
			continue;
		}
		const {type, start, end, value} = node as Node;
		const isGlsl = () => GLSL_MARKER.test(code.slice(start, end));
		if (type === "TemplateLiteral" && isGlsl()) {
			found.push(...(node as {quasis: Range[]}).quasis);
		} else if (type === "Literal" && typeof value === "string" && isGlsl()) {
			found.push({start: start + 1, end: end - 1});
		}
		for (const child of Object.values(node)) {
			if (child && typeof child === "object") stack.push(child);
		}
	}
	return found;
}

/**
 * Сжимает шейдеры three.js и наши — строки с GLSL — в чанках
 * сборки: минификатор JS содержимое строк не трогает. Работает до
 * вычисления хэша в имени файла (renderChunk), так что хэш отражает сжатый
 * код. Строки ищутся парсером, а не регуляркой: обратная кавычка бывает и в
 * комментариях, и в обычных строках.
 */
export function glslWhitespace(): Plugin {
	return {
		name: "glsl-whitespace",
		apply: "build",
		renderChunk(code) {
			const ranges = glslRanges(this.parse(code), code).sort(
				(a, b) => b.start - a.start,
			);
			if (ranges.length === 0) return null;
			let result = code;
			for (const {start, end} of ranges) {
				result =
					result.slice(0, start) +
					squeezeGlsl(result.slice(start, end)) +
					result.slice(end);
			}
			return {code: result, map: null};
		},
	};
}
