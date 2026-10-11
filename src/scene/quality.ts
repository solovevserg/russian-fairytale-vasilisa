import {debugFlags} from "../debugFlags";
import {prefersReducedMotion} from "../lib/dom";
import {urlString} from "../lib/url";

/**
 * Адаптивное качество сцены. Уровень выбирается один раз при загрузке —
 * по устройству, экрану, сети и видеокарте; дальше разрешение подстраивается
 * по fps на лету (см. SceneCanvas). Принудительно: ?quality=low|medium|high,
 * облегчённые ресурсы — ?assets=light|full.
 */
export type QualityTier = "low" | "medium" | "high";

export interface QualitySettings {
	tier: QualityTier;
	/** Пределы плотности пикселей холста (верхний — с учётом экрана). */
	dpr: [number, number];
	antialias: boolean;
	shadows: boolean;
	shadowMapSize: number;
	/** Доля травы (0..1) и дальность, на которой она ещё видна, м. */
	grass: number;
	grassDistance: number;
	/** Доля кустов и деревьев в глубине леса (0..1). */
	bushes: number;
	deepTrees: number;
	/** Множитель детализации веток деревьев (0..1). */
	branches: number;
	/** Отбрасывают ли тень ветки (тень от хвои и листвы остаётся всегда). */
	branchShadows: boolean;
	/** Качание деревьев и травы на ветру. */
	wind: boolean;
	/** Деревьев у кромки поляны (самая дорогая листва — в кадре почти всегда). */
	edgeTrees: number;
	/** Карта теней обновляется раз в столько кадров. */
	shadowEvery: number;
	/**
	 * Облегчённые ресурсы: текстуры земли и деревьев меньшего разрешения,
	 * упрощённые модели (см. lightAssetsFor).
	 */
	lightAssets: boolean;
}

export const QUALITY: Record<
	QualityTier,
	Omit<QualitySettings, "tier" | "lightAssets">
> = {
	high: {
		dpr: [1, 1.75],
		antialias: true,
		shadows: true,
		shadowMapSize: 2048,
		grass: 1,
		grassDistance: 40,
		bushes: 1,
		deepTrees: 1,
		branches: 1,
		branchShadows: true,
		wind: true,
		edgeTrees: 90,
		shadowEvery: 1,
	},
	medium: {
		dpr: [0.75, 1.25],
		antialias: true,
		shadows: true,
		shadowMapSize: 1024,
		grass: 0.6,
		grassDistance: 28,
		bushes: 0.7,
		deepTrees: 0.7,
		branches: 0.65,
		branchShadows: false,
		wind: true,
		// телефоны (и слабые компьютеры): реже деревья у поляны, тени через кадр
		edgeTrees: 70,
		shadowEvery: 2,
	},
	low: {
		dpr: [0.6, 1],
		antialias: false,
		shadows: false,
		shadowMapSize: 512,
		grass: 0.3,
		grassDistance: 18,
		bushes: 0.4,
		deepTrees: 0.45,
		branches: 0.45,
		branchShadows: false,
		wind: false,
		edgeTrees: 55,
		shadowEvery: 2,
	},
};

/** Что известно об устройстве (всё необязательно: браузеры отдают по-разному). */
export interface DeviceInfo {
	cores?: number;
	/** ГБ, navigator.deviceMemory (только Chromium) */
	memory?: number;
	saveData?: boolean;
	/** navigator.connection.effectiveType: slow-2g, 2g, 3g, 4g */
	network?: string;
	/** Видеокарта из WEBGL_debug_renderer_info */
	gpu?: string;
	/** Пикселей на холсте при dpr устройства */
	pixels: number;
	touch: boolean;
	reducedMotion?: boolean;
}

/** Программный рендер и слабые мобильные GPU. */
const WEAK_GPU =
	/swiftshader|llvmpipe|software|mali-[gt]?[0-9]{1,2}\b|adreno \(tm\) [1-5]\d\d|powervr|intel\(r\) (hd|uhd) graphics [2-6]\d{2,3}\b/i;
const STRONG_GPU =
	/nvidia|geforce|rtx|radeon rx|radeon pro|apple m[1-9]|apple gpu|adreno \(tm\) [7-9]\d\d/i;

export function detectTier(d: DeviceInfo): QualityTier {
	if (d.saveData || d.network === "slow-2g" || d.network === "2g") return "low";
	if (d.gpu && WEAK_GPU.test(d.gpu)) return "low";
	if ((d.memory ?? 8) <= 2 || (d.cores ?? 8) <= 2) return "low";

	let score = 0;
	if (d.gpu && STRONG_GPU.test(d.gpu)) score += 2;
	// встроенная графика Intel (Iris Xe и т. п.) тянет сцену, но без запаса
	if (d.gpu && /intel/i.test(d.gpu)) score -= 1;
	if ((d.cores ?? 4) >= 8) score += 1;
	if ((d.memory ?? 4) >= 8) score += 1;
	if ((d.memory ?? 8) <= 4 || (d.cores ?? 8) <= 4) score -= 1;
	if (d.touch) score -= 1;
	if (d.network === "3g") score -= 1;
	// огромный холст (4K/Retina во весь экран) сам по себе дорог
	if (d.pixels > 6_000_000) score -= 1;
	// телефоны и планшеты — не выше среднего: греются и сажают батарею
	if (score >= 2 && !d.touch) return "high";
	if (score >= 0) return "medium";
	return "low";
}

/**
 * Нужны ли облегчённые ресурсы: телефонам и планшетам (мобильная сеть, экран
 * меньше — крупные текстуры не видны) и слабым устройствам.
 */
export function lightAssetsFor(tier: QualityTier, touch: boolean): boolean {
	return touch || tier === "low";
}

export function settingsFor(
	tier: QualityTier,
	reducedMotion = false,
	touch = false,
): QualitySettings {
	const base = QUALITY[tier];
	return {
		tier,
		...base,
		// «уменьшить движение» в системе — деревья и трава не качаются
		wind: base.wind && !reducedMotion,
		lightAssets: lightAssetsFor(tier, touch),
	};
}

function readGpu(): string | undefined {
	try {
		const gl = document.createElement("canvas").getContext("webgl");
		const ext = gl?.getExtension("WEBGL_debug_renderer_info");
		const name = ext
			? gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)
			: undefined;
		gl?.getExtension("WEBGL_lose_context")?.loseContext();
		return typeof name === "string" ? name : undefined;
	} catch {
		return undefined;
	}
}

function readDevice(): DeviceInfo {
	const nav = navigator as Navigator & {
		deviceMemory?: number;
		connection?: {saveData?: boolean; effectiveType?: string};
	};
	const dpr = window.devicePixelRatio || 1;
	return {
		cores: nav.hardwareConcurrency,
		memory: nav.deviceMemory,
		saveData: nav.connection?.saveData,
		network: nav.connection?.effectiveType,
		gpu: readGpu(),
		pixels: window.innerWidth * window.innerHeight * dpr * dpr,
		touch: window.matchMedia("(pointer: coarse)").matches,
		reducedMotion: prefersReducedMotion(),
	};
}

function resolveQuality(): QualitySettings {
	if (typeof window === "undefined") return settingsFor("high");
	const forced = urlString("quality");
	const device = readDevice();
	const tier =
		forced === "low" || forced === "medium" || forced === "high"
			? forced
			: detectTier(device);
	const settings = settingsFor(tier, device.reducedMotion, device.touch);
	if (debugFlags.noShadows) settings.shadows = false;
	const assets = urlString("assets");
	if (assets === "light" || assets === "full") {
		settings.lightAssets = assets === "light";
	}
	if (import.meta.env.DEV)
		console.info(`[quality] ${tier}`, device.gpu ?? "", settings);
	return settings;
}

/** Качество для этой загрузки страницы. */
export const quality: QualitySettings = resolveQuality();
