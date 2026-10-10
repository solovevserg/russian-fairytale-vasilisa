import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Forest } from "./Forest";
import { Ground } from "./Ground";
import { Hut } from "./Hut";

const FOG_COLOR = "#3a4a52";

export function SceneCanvas() {
	return (
		<Canvas
			shadows="percentage"
			dpr={[1, 2]}
			camera={{ position: [8, 4, 11], fov: 45, near: 0.1, far: 200 }}
			onCreated={({ camera }) => camera.lookAt(0, 2.5, 0)}
		>
			<color attach="background" args={[FOG_COLOR]} />
			<fog attach="fog" args={[FOG_COLOR, 15, 70]} />
			<Sky sunPosition={[-40, 6, -60]} turbidity={8} rayleigh={3} />

			<hemisphereLight args={["#9fb4c8", "#2a2418", 0.6]} />
			<directionalLight
				position={[18, 22, 6]}
				intensity={1.6}
				color="#ffcf9a"
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-30}
				shadow-camera-right={30}
				shadow-camera-top={30}
				shadow-camera-bottom={-30}
			/>

			<Ground />
			<Forest />
			<Hut />
		</Canvas>
	);
}
