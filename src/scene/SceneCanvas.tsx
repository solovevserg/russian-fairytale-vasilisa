import {PerformanceMonitor} from "@react-three/drei";
import {Canvas} from "@react-three/fiber";
import {Suspense, useState} from "react";

import {AudioDirector} from "../audio/AudioDirector";
import {debugFlags} from "../debugFlags";
import {BabaYaga} from "./actors/BabaYaga";
import {Birds} from "./actors/Birds";
import {Riders} from "./actors/Riders";
import {Vasilisa} from "./actors/Vasilisa";
import {CameraRig} from "./CameraRig";
import {Deferred} from "./Deferred";
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

const [MIN_DPR, MAX_DPR] = quality.dpr;
const DPR_STEP = 0.25;

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

	return (
		<Canvas
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
			<SkyDome />
			<Lighting />
			<Suspense fallback={null}>
				<TerrainMesh />
			</Suspense>
			{/* лес появится, когда загрузится генератор деревьев (отдельный чанк) */}
			<Suspense fallback={null}>{!debugFlags.noForest && <Forest />}</Suspense>
			{!debugFlags.noGrass && <Vegetation />}
			<group position={[0, GROUND_Y, 0]}>
				<Deferred until="clearing">
					<Hut />
				</Deferred>
				<Torch position={[-2.4, 0, 2.6]} />
				<Torch position={[2.4, 0, 2.6]} phase={2.3} />
			</group>
			{/* изба Василисы стоит на своём дворе, высота — по рельефу */}
			<Suspense fallback={null}>
				<House />
			</Suspense>
			<Garden />
			<Fence />
			<Suspense fallback={null}>
				<Vasilisa />
			</Suspense>
			<Deferred until="baba-yaga">
				<BabaYaga />
			</Deferred>
			<Riders />
			<Suspense fallback={null}>
				<Birds />
			</Suspense>
		</Canvas>
	);
}
