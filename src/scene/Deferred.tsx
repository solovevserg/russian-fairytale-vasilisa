import {type ReactNode, Suspense, useState} from "react";

import {useStoryStore} from "../state/storyStore";
import {CHAPTER_IDS, type ChapterId} from "../story/chapters";
import {Precompiled} from "./Precompiled";

/** За сколько глав до первого появления начинать загрузку. */
const LOAD_AHEAD = 2;

/**
 * Монтирует содержимое (и тем самым начинает грузить его модели), только
 * когда читатель подходит к главе `until` — за LOAD_AHEAD глав до неё, — и
 * дальше уже не размонтирует. Пока не загрузилось, остальная сцена
 * рисуется как есть (Suspense без заглушки); загруженное показывается, когда
 * скомпилированы его шейдеры (Precompiled).
 *
 * Источников света внутри быть не должно: новый свет перекомпилирует все
 * шейдеры сцены — свет ставится снаружи, а откладывается только модель.
 */
export function Deferred({
	until,
	children,
}: {
	/** Глава, в которой содержимое впервые появляется в кадре. */
	until: ChapterId;
	children: ReactNode;
}) {
	const near = useStoryStore(
		(s) => s.progress >= CHAPTER_IDS.indexOf(until) - LOAD_AHEAD,
	);
	const [reached, setReached] = useState(near);
	if (near && !reached) setReached(true);
	if (!reached && !near) return null;
	return (
		<Suspense fallback={null}>
			<Precompiled>{children}</Precompiled>
		</Suspense>
	);
}
