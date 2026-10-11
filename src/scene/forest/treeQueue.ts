import type {TreeVariantAssets} from "./createTreeVariant";
import type {TreeVariantSpec} from "./variants";

/**
 * Очередь генерации деревьев: по одному варианту за задачу, в паузах между
 * кадрами, — вместо одной долгой задачи (на телефоне ~0,8 с), которая
 * замораживает страницу. Сначала — варианты с меньшим приоритетом (деревья
 * у дома Василисы в первом кадре), потом остальные.
 */

/** Не дольше скольких мс ждать паузы между кадрами перед следующим вариантом. */
const IDLE_TIMEOUT = 100;

interface Job {
	spec: TreeVariantSpec;
	priority: number;
	resolve: (assets: TreeVariantAssets) => void;
	reject: (error: unknown) => void;
}

let factory: Promise<typeof import("./createTreeVariant")> | undefined;
const queue: Job[] = [];
const results = new Map<string, Promise<TreeVariantAssets>>();
let running = false;

/**
 * Генератор деревьев — отдельный чанк (ez-tree и его текстуры): грузится при
 * первом дереве на сцене (с ?noforest&nograss — не грузится вовсе).
 */
function loadFactory() {
	factory ??= import("./createTreeVariant");
	return factory;
}

function nextPause(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestIdleCallback === "function") {
			requestIdleCallback(() => resolve(), {timeout: IDLE_TIMEOUT});
		} else {
			setTimeout(resolve, 0);
		}
	});
}

async function run(): Promise<void> {
	if (running) return;
	running = true;
	try {
		const {createTreeVariant} = await loadFactory();
		while (queue.length > 0) {
			await nextPause();
			queue.sort((a, b) => a.priority - b.priority);
			const job = queue.shift();
			if (!job) break;
			const started = performance.now();
			try {
				job.resolve(createTreeVariant(job.spec));
			} catch (error) {
				job.reject(error);
			}
			if (import.meta.env.DEV) {
				console.info(
					`[trees] ${job.spec.id} за ${Math.round(performance.now() - started)} мс`,
				);
			}
		}
	} catch (error) {
		// генератор не загрузился — отклоняем всё, что ждёт
		for (const job of queue.splice(0)) job.reject(error);
	} finally {
		running = false;
	}
}

/**
 * Вариант дерева по спецификации — когда до него дойдёт очередь. Один и тот
 * же вариант (по id) генерируется один раз.
 *
 * @param priority — меньше — раньше: 0 — деревья у дома, дальше — остальные.
 */
export function generateTree(
	spec: TreeVariantSpec,
	priority: number,
): Promise<TreeVariantAssets> {
	let result = results.get(spec.id);
	if (!result) {
		result = new Promise<TreeVariantAssets>((resolve, reject) => {
			queue.push({spec, priority, resolve, reject});
		});
		results.set(spec.id, result);
		void run();
	}
	return result;
}
