/** Отладочные флаги из URL: ?noshadows&noleaves… — для замеров производительности. */
const params =
	typeof window === "undefined"
		? new URLSearchParams()
		: new URLSearchParams(window.location.search);

export const debugFlags = {
	noShadows: params.has("noshadows"),
	noLeaves: params.has("noleaves"),
	noBranches: params.has("nobranches"),
	noForest: params.has("noforest"),
	noGrass: params.has("nograss"),
	/** Камера сразу встаёт в кадр главы, без сглаживания (снимки, тесты). */
	instant: params.has("instant"),
};
