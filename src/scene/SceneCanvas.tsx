import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AudioDirector } from "../audio/AudioDirector";
import { debugFlags } from "../debugFlags";
import { BabaYaga } from "./actors/BabaYaga";
import { Birds } from "./actors/Birds";
import { Riders } from "./actors/Riders";
import { Vasilisa } from "./actors/Vasilisa";
import { CameraRig } from "./CameraRig";
import { Fence } from "./Fence";
import { Forest } from "./forest/Forest";
import { House } from "./House";
import { Hut } from "./Hut";
import { Lighting } from "./sky/Lighting";
import { SkyDome } from "./sky/SkyDome";
import { TerrainMesh } from "./TerrainMesh";
import { Torch } from "./Torch";
import { heightAt } from "./terrain";
import { Vegetation } from "./vegetation/Vegetation";

const GROUND_Y = heightAt(0, 0);

export function SceneCanvas() {
	return (
		<Canvas
			shadows={debugFlags.noShadows ? false : "percentage"}
			dpr={[1, 2]}
			camera={{ position: [7.5, 2.2, 11.5], fov: 55, near: 0.1, far: 600 }}
			onCreated={({ gl }) => {
				// для отладки производительности из консоли: __renderer.info.render
				if (import.meta.env.DEV) Object.assign(window, { __renderer: gl });
			}}
		>
			<CameraRig />
			<AudioDirector />
			<SkyDome />
			<Lighting />
			<Suspense fallback={null}>
				<TerrainMesh />
			</Suspense>
			{!debugFlags.noForest && <Forest />}
			{!debugFlags.noGrass && <Vegetation />}
			<group position={[0, GROUND_Y, 0]}>
				<Suspense fallback={null}>
					<Hut />
				</Suspense>
				<Torch position={[-2.4, 0, 2.6]} />
				<Torch position={[2.4, 0, 2.6]} phase={2.3} />
			</group>
			{/* изба Василисы стоит на своём дворе, высота — по рельефу */}
			<Suspense fallback={null}>
				<House />
			</Suspense>
			<Fence />
			<Suspense fallback={null}>
				<Vasilisa />
				<BabaYaga />
			</Suspense>
			<Riders />
			<Birds />
		</Canvas>
	);
}
