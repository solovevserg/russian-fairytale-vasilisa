import { Color, Vector3 } from "three";

export interface SkyPalette {
	zenith: string;
	horizon: string;
	sunColor: string;
	sunIntensity: number;
	moonIntensity: number;
	hemiSky: string;
	hemiGround: string;
	hemiIntensity: number;
	fogDensity: number;
	/** 0 — день, 1 — ночь: звёзды, факелы, светящиеся окна. */
	night: number;
}

// Ключевые точки палитры по часам. Днём — краски Билибина (бирюза, охра, золото),
// в сумерках и ночью — холодный приглушённый тёмный лес.
const PALETTE_KEYS: [number, SkyPalette][] = [
	[
		0,
		{
			zenith: "#03060d",
			horizon: "#141c26",
			sunColor: "#ffb070",
			sunIntensity: 0,
			moonIntensity: 0.85,
			hemiSky: "#3a5070",
			hemiGround: "#0b0d0c",
			hemiIntensity: 0.4,
			fogDensity: 0.03,
			night: 1,
		},
	],
	[
		4.5,
		{
			zenith: "#070b18",
			horizon: "#1c2433",
			sunColor: "#ff9a5a",
			sunIntensity: 0,
			moonIntensity: 0.65,
			hemiSky: "#3a4a66",
			hemiGround: "#0b0d0c",
			hemiIntensity: 0.4,
			fogDensity: 0.032,
			night: 1,
		},
	],
	[
		6,
		{
			zenith: "#3b5a86",
			horizon: "#e8a77a",
			sunColor: "#ffb27a",
			sunIntensity: 1.2,
			moonIntensity: 0,
			hemiSky: "#b7c4d6",
			hemiGround: "#3a2e22",
			hemiIntensity: 0.5,
			fogDensity: 0.03,
			night: 0.3,
		},
	],
	[
		8,
		{
			zenith: "#2f78a8",
			horizon: "#f2d08f",
			sunColor: "#ffe2b0",
			sunIntensity: 2.4,
			moonIntensity: 0,
			hemiSky: "#c9dbe8",
			hemiGround: "#4a3a24",
			hemiIntensity: 0.7,
			fogDensity: 0.02,
			night: 0,
		},
	],
	[
		12,
		{
			zenith: "#1f6fa3",
			horizon: "#e9d6a0",
			sunColor: "#fff1d0",
			sunIntensity: 3,
			moonIntensity: 0,
			hemiSky: "#d5e6ee",
			hemiGround: "#4f4026",
			hemiIntensity: 0.8,
			fogDensity: 0.016,
			night: 0,
		},
	],
	[
		17,
		{
			zenith: "#2a6c96",
			horizon: "#f0c27a",
			sunColor: "#ffd090",
			sunIntensity: 2.4,
			moonIntensity: 0,
			hemiSky: "#d0d8d0",
			hemiGround: "#4a3622",
			hemiIntensity: 0.7,
			fogDensity: 0.02,
			night: 0,
		},
	],
	[
		19,
		{
			zenith: "#3a4f78",
			horizon: "#e07a45",
			sunColor: "#ff8a4a",
			sunIntensity: 1.4,
			moonIntensity: 0,
			hemiSky: "#8a8fa8",
			hemiGround: "#2e2018",
			hemiIntensity: 0.45,
			fogDensity: 0.026,
			night: 0.4,
		},
	],
	[
		20.5,
		{
			zenith: "#141d36",
			horizon: "#4a3a4e",
			sunColor: "#ff7040",
			sunIntensity: 0,
			moonIntensity: 0.45,
			hemiSky: "#4a5578",
			hemiGround: "#141210",
			hemiIntensity: 0.4,
			fogDensity: 0.03,
			night: 0.85,
		},
	],
	[
		24,
		{
			zenith: "#03060d",
			horizon: "#141c26",
			sunColor: "#ffb070",
			sunIntensity: 0,
			moonIntensity: 0.85,
			hemiSky: "#3a5070",
			hemiGround: "#0b0d0c",
			hemiIntensity: 0.4,
			fogDensity: 0.03,
			night: 1,
		},
	],
];

const colorA = new Color();
const colorB = new Color();

function mixColor(a: string, b: string, t: number): string {
	return `#${colorA.set(a).lerp(colorB.set(b), t).getHexString()}`;
}

function mix(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function normalizeHours(hours: number): number {
	return ((hours % 24) + 24) % 24;
}

export function paletteAt(hours: number): SkyPalette {
	const h = normalizeHours(hours);
	let i = 0;
	while (i < PALETTE_KEYS.length - 2 && PALETTE_KEYS[i + 1][0] <= h) i++;
	const [h0, a] = PALETTE_KEYS[i];
	const [h1, b] = PALETTE_KEYS[i + 1];
	const t = (h - h0) / (h1 - h0);
	return {
		zenith: mixColor(a.zenith, b.zenith, t),
		horizon: mixColor(a.horizon, b.horizon, t),
		sunColor: mixColor(a.sunColor, b.sunColor, t),
		sunIntensity: mix(a.sunIntensity, b.sunIntensity, t),
		moonIntensity: mix(a.moonIntensity, b.moonIntensity, t),
		hemiSky: mixColor(a.hemiSky, b.hemiSky, t),
		hemiGround: mixColor(a.hemiGround, b.hemiGround, t),
		hemiIntensity: mix(a.hemiIntensity, b.hemiIntensity, t),
		fogDensity: mix(a.fogDensity, b.fogDensity, t),
		night: mix(a.night, b.night, t),
	};
}

/**
 * Направление на солнце (единичный вектор). Восход ~6:00 на востоке (+X),
 * полдень на юге (-Z), закат ~18:00 на западе (-X).
 */
export function sunDirection(hours: number, target = new Vector3()): Vector3 {
	const angle = ((normalizeHours(hours) - 6) / 24) * Math.PI * 2;
	const maxElevation = 0.85;
	return target
		.set(
			Math.cos(angle),
			Math.sin(angle) * maxElevation,
			-Math.sin(angle) * 0.6 - 0.3,
		)
		.normalize();
}

/** Луна — примерно напротив солнца, чуть выше над горизонтом. */
export function moonDirection(hours: number, target = new Vector3()): Vector3 {
	sunDirection(hours + 12, target);
	target.y = Math.max(target.y, 0.25);
	return target.normalize();
}
