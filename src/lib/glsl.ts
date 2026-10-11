/** Спецсимволы регулярных выражений. */
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * Регулярка для строки шейдера без учёта пробелов: «`a = f( b );`» находит
 * и «`a=f(b);`». Нужна, потому что при сборке шейдеры сжимаются
 * (scripts/vite/glslWhitespace.ts), а в dev-режиме — нет.
 */
export function glslPattern(line: string): RegExp {
	const tokens = line
		.trim()
		.split(/\s+|\b|(?=\W)|(?<=\W)/)
		.filter(Boolean);
	return new RegExp(
		tokens.map((token) => token.replace(REGEX_SPECIAL, "\\$&")).join("\\s*"),
	);
}

/**
 * Заменяет строку в куске шейдера без учёта пробелов; если строки нет
 * (например, сменилась версия three) — бросает ошибку с её текстом.
 *
 * @param chunk — текст шейдера (кусок ShaderChunk).
 * @param line — строка, которую заменить, как в исходниках three.
 * @param replacement — чем заменить.
 */
export function replaceGlslLine(
	chunk: string,
	line: string,
	replacement: string,
): string {
	const pattern = glslPattern(line);
	if (!pattern.test(chunk)) {
		throw new Error(`Строка не найдена в шейдере: ${line}`);
	}
	return chunk.replace(pattern, () => replacement);
}
