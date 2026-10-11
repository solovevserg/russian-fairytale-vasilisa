import {PerformanceMonitor} from "@react-three/drei";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {Suspense, useLayoutEffect, useRef, useState} from "react";
import type {Light} from "three";

import {AudioDirector} from "../audio/AudioDirector";
import {debugFlags} from "../debugFlags";
import {BabaYaga} from "./actors/BabaYaga";
import {Birds} from "./actors/Birds";
import {Riders} from "./actors/Riders";
import {Vasilisa} from "./actors/Vasilisa";
import {CameraRig} from "./CameraRig";
import {Fence} from "./Fence";
import {Forest} from "./forest/Forest";
import {Garden} from "./Garden";
import {House} from "./House";
import {Hut} from "./Hut";
import {quality} from "./quality";
import {Lighting} from "./sky/Lighting";
import {SkyDome} from "./sky/SkyDome";
import {TerrainMesh} from "./TerrainMesh";
import {Torch} from "./Torch";
import {heightAt} from "./terrain";
import {Vegetation} from "./vegetation/Vegetation";

const GROUND_Y = heightAt(0, 0);

/**
 * Компилирует шейдеры стартовой сцены в фоне (`compileAsync`,
 * KHR_parallel_shader_compile) и только потом запускает кадры: иначе
 * компиляция идёт в первом кадре и замораживает страницу на секунду-две.
 * Ставится последним внутри Suspense стартовой сцены — срабатывает, когда
 * всё в ней загружено и смонтировано.
 */
function StartWhenCompiled({onReady}: {onReady: () => void}) {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	const camera = useThree((s) => s.camera);
	// biome-ignore lint/correctness/useExhaustiveDependencies: один раз — при первом монтировании
	useLayoutEffect(() => {
		let alive = true;
		const start = () => {
			if (alive) onReady();
		};
		gl.compileAsync(scene, camera).then(start, start);
		return () => {
			alive = false;
		};
	}, []);
	return null;
}

const [MIN_DPR, MAX_DPR] = quality.dpr;
const DPR_STEP = 0.25;

/**
 * Только в dev: предупреждает, если после старта сцены изменилось число
 * источников света, — каждый новый свет перекомпилирует все шейдеры (см.
 * StartWhenCompiled, Deferred).
 */
function LightCountGuard() {
	const scene = useThree((s) => s.scene);
	const count = useRef(-1);
	useFrame(() => {
		let lights = 0;
		scene.traverse((object) => {
			if ((object as Light).isLight) lights++;
		});
		if (count.current >= 0 && lights !== count.current) {
			console.warn(
				`[scene] источников света было ${count.current}, стало ${lights}: все шейдеры перекомпилируются — свет должен монтироваться со стартовой сценой`,
			);
		}
		count.current = lights;
	});
	return null;
}

export function SceneCanvas() {
	// разрешение холста подстраивается под fps: проседает — снижаем, есть запас — поднимаем
	const [dpr, setDpr] = useState(() =>
		Math.min(window.devicePixelRatio || 1, MAX_DPR),
	);
	const step = (direction: 1 | -1) =>
		setDpr((value) =>
			Math.min(
				Math.max(value + direction * DPR_STEP, MIN_DPR),
				Math.min(window.devicePixelRatio || 1, MAX_DPR),
			),
		);

	// кадры не рисуются, пока шейдеры стартовой сцены не скомпилированы в фоне
	const [frameloop, setFrameloop] = useState<"never" | "always">("never");

	return (
		<Canvas
			frameloop={frameloop}
			shadows={quality.shadows ? "percentage" : false}
			dpr={dpr}
			gl={{antialias: quality.antialias, powerPreference: "high-performance"}}
			camera={{position: [7.5, 2.2, 11.5], fov: 55, near: 0.1, far: 600}}
			onCreated={({gl}) => {
				// для отладки производительности из консоли: __renderer.info.render
				if (import.meta.env.DEV) Object.assign(window, {__renderer: gl});
			}}
		>
			<PerformanceMonitor
				bounds={() => [40, 58]}
				onDecline={() => step(-1)}
				onIncline={() => step(1)}
			/>
			<CameraRig />
			<AudioDirector />
			{/*
			 * Стартовая сцена появляется целиком, когда всё в ней загружено: так
			 * набор источников света не меняется после первого кадра (иначе каждый
			 * новый свет — перекомпиляция всех шейдеров). Позже догружаются только
			 * меши без света (Deferred, лес) — их шейдеры компилируются в фоне.
			 */}
			<Suspense fallback={null}>
				<SkyDome />
				<Lighting />
				<TerrainMesh />
				{!debugFlags.noForest && <Forest />}
				{!debugFlags.noGrass && <Vegetation />}
				<group position={[0, GROUND_Y, 0]}>
					<Hut />
					<Torch position={[-2.4, 0, 2.6]} />
					<Torch position={[2.4, 0, 2.6]} phase={2.3} />
				</group>
				{/* изба Василисы стоит на своём дворе, высота — по рельефу */}
				<House />
				<Garden />
				<Fence />
				<Vasilisa />
				<BabaYaga />
				<Riders />
				<Birds />
				<StartWhenCompiled onReady={() => setFrameloop("always")} />
				{import.meta.env.DEV && <LightCountGuard />}
			</Suspense>
		</Canvas>
	);
}
