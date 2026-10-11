import {useFrame} from "@react-three/fiber";
import {type ReactNode, useRef} from "react";
import type {Group, Light, Object3D} from "three";

import {currentSample} from "../story/currentSample";
import type {TimelineSample} from "../story/timeline";

/** Что рисуется: меши, точки, линии, спрайты (не группы и не свет). */
function isDrawable(object: Object3D): boolean {
	const o = object as Object3D & {
		isMesh?: boolean;
		isPoints?: boolean;
		isLine?: boolean;
		isSprite?: boolean;
	};
	return !!(o.isMesh || o.isPoints || o.isLine || o.isSprite);
}

/**
 * Есть ли содержимое в сцене — по кадру истории (`when`): избушка с
 * частоколом и факелами — с «Поляны», изба Василисы с огородом — в начале
 * и в конце пути.
 *
 * Меши прячутся, а свет не прячется, а гасится (интенсивность 0): число
 * источников света входит в шейдеры, и спрятанный свет перекомпилировал бы
 * их все. Гасит после компонентов внутри (useFrame родителя идёт после
 * дочерних), так что их мерцание и ночная подсветка не мешают.
 */
export function Presence({
	when,
	children,
}: {
	when: (sample: TimelineSample) => boolean;
	children: ReactNode;
}) {
	const root = useRef<Group>(null);
	useFrame(() => {
		const group = root.current;
		if (!group) return;
		const shown = when(currentSample);
		group.traverse((object) => {
			if ((object as Light).isLight) {
				if (!shown) (object as Light).intensity = 0;
			} else if (isDrawable(object)) {
				object.visible = shown;
			}
		});
	});
	return <group ref={root}>{children}</group>;
}
