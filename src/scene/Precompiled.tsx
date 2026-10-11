import {useThree} from "@react-three/fiber";
import {type ReactNode, useLayoutEffect, useRef, useState} from "react";
import type {Group} from "three";

/**
 * Показывает содержимое, только когда его шейдеры скомпилированы, — в фоне
 * (`renderer.compileAsync`, расширение KHR_parallel_shader_compile), а не в
 * первом кадре, где компиляция замораживает страницу на секунду и больше.
 * Пока компилируется, содержимое смонтировано, но скрыто.
 *
 * Внутри Suspense ставится под ним: эффект срабатывает, когда всё внутри
 * уже загрузилось. Материалы теней compileAsync не охватывает — они
 * компилируются в первом кадре с тенью.
 */
export function Precompiled({children}: {children: ReactNode}) {
	const group = useRef<Group>(null);
	const gl = useThree((s) => s.gl);
	const camera = useThree((s) => s.camera);
	const scene = useThree((s) => s.scene);
	const [ready, setReady] = useState(false);

	useLayoutEffect(() => {
		const object = group.current;
		if (!object) return;
		let alive = true;
		const show = () => {
			if (alive) setReady(true);
		};
		// не скомпилировалось — покажем как есть: компиляция пройдёт в кадре
		gl.compileAsync(object, camera, scene).then(show, show);
		return () => {
			alive = false;
		};
	}, [gl, camera, scene]);

	return (
		<group ref={group} visible={ready}>
			{children}
		</group>
	);
}
