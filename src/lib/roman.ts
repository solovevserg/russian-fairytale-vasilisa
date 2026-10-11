const ROMAN: [number, string][] = [
	[1000, "M"],
	[900, "CM"],
	[500, "D"],
	[400, "CD"],
	[100, "C"],
	[90, "XC"],
	[50, "L"],
	[40, "XL"],
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

/**
 * Римская запись натурального числа (1..3999).
 *
 * @example toRoman(9) // "IX"
 */
export function toRoman(n: number): string {
	let out = "";
	let rest = n;
	for (const [value, digits] of ROMAN) {
		while (rest >= value) {
			out += digits;
			rest -= value;
		}
	}
	return out;
}
