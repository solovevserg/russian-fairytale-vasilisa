/**
 * Сервис-воркер: после первого визита сказка работает без сети. Страница —
 * из сети (новая выкладка видна сразу), без сети — из кэша; код, модели,
 * текстуры, шрифты и звук — из кэша. Всё нужное этому устройству воркер
 * докачивает в фоне, когда страница попросит (сообщение `warm`, см.
 * register.ts). Правила — в policy.ts, список файлов вшивается при сборке
 * (scripts/vite/serviceWorker.ts).
 */
import {
	cacheKey,
	currentKeys,
	type DeviceAssets,
	offlineFiles,
	PAGE,
	parseRange,
	type SwManifest,
	strategyFor,
	type WarmMessage,
} from "./policy";

/** Заменяется при сборке списком файлов (JSON). */
declare const __SW_MANIFEST__: SwManifest;

// Типы событий воркера (в lib.dom их нет, а lib.webworker конфликтует с DOM).
interface ExtendableEvent extends Event {
	waitUntil(promise: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
	request: Request;
	respondWith(response: Promise<Response>): void;
}
interface MessageEvent extends ExtendableEvent {
	data: unknown;
}
interface WorkerScope {
	location: Location;
	skipWaiting(): Promise<void>;
	clients: {claim(): Promise<void>};
	addEventListener(
		type: "install" | "activate",
		fn: (e: ExtendableEvent) => void,
	): void;
	addEventListener(type: "fetch", fn: (e: FetchEvent) => void): void;
	addEventListener(type: "message", fn: (e: MessageEvent) => void): void;
}

const scope = self as unknown as WorkerScope;
const manifest = __SW_MANIFEST__;
const CACHE = "vasilisa";
/** Корень сайта: /russian-fairytale-vasilisa/ */
const BASE = new URL("./", scope.location.href).pathname;
/** Сколько файлов докачивать одновременно — чтобы не забивать сеть. */
const WARM_PARALLEL = 3;

const keyOf = (path: string) => BASE + cacheKey(path, manifest);

/** Скачивает файл целиком и кладёт в кэш (если его там ещё нет). */
async function store(cache: Cache, path: string): Promise<void> {
	if (await cache.match(keyOf(path))) return;
	const response = await fetch(BASE + path);
	if (response.status === 200) await cache.put(keyOf(path), response);
}

async function cacheFirst(request: Request, path: string): Promise<Response> {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(keyOf(path));
	if (cached) return cached;
	const response = await fetch(request);
	if (response.status === 200) await cache.put(keyOf(path), response.clone());
	return response;
}

async function networkFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	try {
		const response = await fetch(request);
		if (response.ok) await cache.put(keyOf(PAGE), response.clone());
		return response;
	} catch (error) {
		const cached = await cache.match(keyOf(PAGE));
		if (cached) return cached;
		throw error;
	}
}

/** Звук: из кэша (кусок по Range — вырезаем), если ещё не скачан — из сети. */
async function media(request: Request, path: string): Promise<Response> {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(keyOf(path));
	if (!cached) return fetch(request);
	const header = request.headers.get("range");
	if (!header) return cached;
	const body = await cached.arrayBuffer();
	const range = parseRange(header, body.byteLength);
	if (!range) {
		return new Response(null, {
			status: 416,
			headers: {"Content-Range": `bytes */${body.byteLength}`},
		});
	}
	const {start, end} = range;
	return new Response(body.slice(start, end + 1), {
		status: 206,
		headers: {
			"Content-Type": cached.headers.get("Content-Type") ?? "",
			"Content-Range": `bytes ${start}-${end}/${body.byteLength}`,
			"Content-Length": String(end - start + 1),
			"Accept-Ranges": "bytes",
		},
	});
}

/** Докачивает в кэш всё, что нужно устройству для работы без сети. */
async function warm(device: DeviceAssets): Promise<void> {
	const cache = await caches.open(CACHE);
	const queue = offlineFiles(manifest, device);
	const worker = async () => {
		for (let path = queue.shift(); path; path = queue.shift()) {
			// без сети или файл пропал — докачаем при следующем визите
			await store(cache, path).catch(() => {});
		}
	};
	await Promise.all(Array.from({length: WARM_PARALLEL}, worker));
}

scope.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await Promise.all(manifest.shell.map((path) => store(cache, path)));
			await scope.skipWaiting();
		})(),
	);
});

scope.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			// всё, чего нет в текущем списке (или с другим хэшем), — устарело
			const keep = currentKeys(manifest);
			const cache = await caches.open(CACHE);
			for (const request of await cache.keys()) {
				const {pathname, search} = new URL(request.url);
				if (!keep.has(pathname.slice(BASE.length) + search)) {
					await cache.delete(request);
				}
			}
			await scope.clients.claim();
		})(),
	);
});

scope.addEventListener("message", (event) => {
	const message = event.data as WarmMessage | null;
	if (message?.type === "warm") event.waitUntil(warm(message.device));
});

scope.addEventListener("fetch", (event) => {
	const {request} = event;
	const url = new URL(request.url);
	if (request.method !== "GET" || url.origin !== scope.location.origin) return;
	if (!url.pathname.startsWith(BASE)) return;
	const path = url.pathname.slice(BASE.length);
	const strategy = strategyFor(path, manifest);
	if (strategy === "media") {
		event.respondWith(media(request, path));
	} else if (request.headers.has("range")) {
		// кусок не звукового файла — редкость, отдаём из сети как есть
	} else if (strategy === "cache-first") {
		event.respondWith(cacheFirst(request, path));
	} else if (strategy === "network-first") {
		event.respondWith(networkFirst(request));
	}
});
