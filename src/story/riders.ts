import type {QualityTier} from "../scene/quality";
import {onPath} from "./places";
import type {RiderColor, Vec3} from "./types";

/** Всадник — всё о нём в одном месте. */
export interface RiderSpec {
	/** Маршрут: точки сплайна на земле. */
	points: Vec3[];
	/** Длительность скачки, с (на обычном устройстве). */
	duration: number;
	/** Задержка от входа в главу до начала скачки, с. */
	delay: number;
	/**
	 * Во сколько раз медленнее скакать на слабых устройствах — иначе всадника
	 * не разглядеть при низкой частоте кадров.
	 */
	slowerOn: Partial<Record<QualityTier, number>>;
	/**
	 * Смена времени суток относительно скачки: `after` — доля пути до начала
	 * смены, `fade` — её длительность в долях скачки (0 — мгновенно).
	 */
	light: {after: number; fade: number};
	/** Цвета коня, всадника и плаща. */
	palette: {horse: string; rider: string; cloak: string};
}

/** Чёрный всадник скачет кругом вокруг забора, м от центра избушки. */
const BLACK_RIDER_RADIUS = 10;

/**
 * Чёрный всадник: из леса — близко мимо камеры, два круга вокруг забора
 * (каждый раз снова мимо камеры) — и в чащу.
 */
function blackRiderPoints(): Vec3[] {
	const points: Vec3[] = [[19, 0, -4]];
	const laps = 2;
	const steps = 12 * laps;
	// против часовой стрелки (если смотреть сверху), от камеры через ворота
	for (let i = 0; i <= steps; i++) {
		const angle = -0.25 + (i / steps) * Math.PI * 2 * laps;
		points.push([
			Math.cos(angle) * BLACK_RIDER_RADIUS,
			0,
			Math.sin(angle) * BLACK_RIDER_RADIUS,
		]);
	}
	points.push([16, 0, -10], [25, 0, -17]);
	return points;
}

/**
 * Три всадника сказки. Белый — светает вместе со скачкой; красный время не
 * меняет (рассвет — в следующей главе «Восход»); чёрный — темнеет, пока он
 * кружит, и к его уходу в чащу — ночь.
 */
export const RIDERS: Record<RiderColor, RiderSpec> = {
	// перебегает ей дорогу слева направо — наискосок, чтобы дольше быть в кадре
	white: {
		points: [onPath(14, 0, -10), onPath(21, 0, 0), onPath(27, 0, 9)],
		duration: 4.5,
		delay: 0,
		slowerOn: {low: 1 / 0.75},
		light: {after: 0, fade: 1},
		palette: {horse: "#e9e6de", rider: "#f4f1ea", cloak: "#dcd8cc"},
	},
	red: {
		points: [onPath(23, 0, 16), onPath(23, 0, -16)],
		duration: 3.5,
		delay: 0,
		slowerOn: {low: 1 / 0.75},
		light: {after: 0, fade: 0},
		palette: {horse: "#8e2a1e", rider: "#b3352a", cloak: "#7d1f16"},
	},
	// секунда — чтобы камера успела встать туда, где он проскачет
	black: {
		points: blackRiderPoints(),
		duration: 17,
		delay: 0.3,
		slowerOn: {low: 1 / 0.75, medium: 1 / 0.85},
		light: {after: 0.05, fade: 0.9},
		palette: {horse: "#141312", rider: "#1b1a19", cloak: "#0d0c0c"},
	},
};
