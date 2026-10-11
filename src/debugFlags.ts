import { urlFlag } from "./lib/url";

/** Отладочные флаги из URL: ?noshadows&noleaves… — для замеров производительности. */
export const debugFlags = {
	/** ?noshadows — без теней. */
	noShadows: urlFlag("noshadows"),
	/** ?noleaves — деревья без листвы. */
	noLeaves: urlFlag("noleaves"),
	/** ?nobranches — деревья без веток. */
	noBranches: urlFlag("nobranches"),
	/** ?noforest — без леса. */
	noForest: urlFlag("noforest"),
	/** ?nograss — без травы. */
	noGrass: urlFlag("nograss"),
	/** Камера сразу встаёт в кадр главы, без сглаживания (снимки, тесты). */
	instant: urlFlag("instant"),
	/** ?still — без покачивания камеры (эталонные снимки глав). */
	still: urlFlag("still"),
};
