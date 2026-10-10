import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { BackSide, Color, ShaderMaterial, Vector3 } from "three";
import { useSceneStore } from "../../state/sceneStore";
import { moonDirection, paletteAt, sunDirection } from "./timeOfDay";

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
	vDirection = normalize(position);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Градиентное небо: горизонт совпадает с цветом тумана, чтобы дальний лес
// растворялся без шва. Плюс диск и ореол солнца, луна и звёзды ночью.
const fragmentShader = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uMoonDirection;
uniform float uNight;
varying vec3 vDirection;

float hash(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
	vec3 dir = normalize(vDirection);
	float h = clamp(dir.y, 0.0, 1.0);
	vec3 color = mix(uHorizon, uZenith, pow(h, 0.55));

	float sunDot = max(dot(dir, uSunDirection), 0.0);
	float sunVisible = smoothstep(-0.15, 0.05, uSunDirection.y);
	color += uSunColor * (pow(sunDot, 8.0) * 0.35 + pow(sunDot, 64.0) * 0.6) * sunVisible;
	color += uSunColor * smoothstep(0.9995, 0.9998, sunDot) * 4.0 * sunVisible;

	float moonDot = dot(dir, uMoonDirection);
	color += vec3(0.85, 0.9, 1.0) * smoothstep(0.9992, 0.9995, moonDot) * 1.5 * uNight;
	color += vec3(0.25, 0.3, 0.4) * pow(max(moonDot, 0.0), 32.0) * 0.4 * uNight;

	vec3 cell = floor(dir * 300.0);
	float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.3, dir.y) * smoothstep(0.6, 1.0, uNight);
	float twinkle = 0.6 + 0.4 * hash(cell + 1.0);
	color += vec3(star * twinkle * uNight);

	gl_FragColor = vec4(color, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

export function SkyDome() {
	const material = useMemo(
		() =>
			new ShaderMaterial({
				vertexShader,
				fragmentShader,
				side: BackSide,
				depthWrite: false,
				uniforms: {
					uZenith: { value: new Color() },
					uHorizon: { value: new Color() },
					uSunDirection: { value: new Vector3() },
					uSunColor: { value: new Color() },
					uMoonDirection: { value: new Vector3() },
					uNight: { value: 0 },
				},
			}),
		[],
	);

	useFrame(() => {
		const hours = useSceneStore.getState().timeOfDay;
		const palette = paletteAt(hours);
		const u = material.uniforms;
		u.uZenith.value.set(palette.zenith);
		u.uHorizon.value.set(palette.horizon);
		u.uSunColor.value.set(palette.sunColor);
		sunDirection(hours, u.uSunDirection.value);
		moonDirection(hours, u.uMoonDirection.value);
		u.uNight.value = palette.night;
	});

	return (
		<mesh
			material={material}
			scale={400}
			renderOrder={-1}
			frustumCulled={false}
		>
			<sphereGeometry args={[1, 32, 16]} />
		</mesh>
	);
}
