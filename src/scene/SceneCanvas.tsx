import { Canvas } from "@react-three/fiber";
import { AudioDirector } from "../audio/AudioDirector";
import { debugFlags } from "../debugFlags";
import { CameraRig } from "./CameraRig";
import { Forest } from "./forest/Forest";
import { Hut } from "./Hut";
import { Lighting } from "./sky/Lighting";
import { SkyDome } from "./sky/SkyDome";
import { TerrainMesh } from "./TerrainMesh";
import { Torch } from "./Torch";
import { heightAt } from "./terrain";

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
			<TerrainMesh />
			{!debugFlags.noForest && <Forest />}
			<group position={[0, GROUND_Y, 0]}>
				<Hut />
				<Torch position={[-2.4, 0, 2.6]} />
				<Torch position={[2.4, 0, 2.6]} phase={2.3} />
			</group>
		</Canvas>
	);
}
