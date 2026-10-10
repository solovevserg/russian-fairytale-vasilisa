import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	BackSide,
	Color,
	type Mesh,
	ShaderMaterial,
	Vector2,
	Vector3,
} from "three";
import { useSceneStore } from "../../state/sceneStore";
import { windUniforms } from "../forest/wind";
import { moonDirection, paletteAt, sunDirection } from "./timeOfDay";

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
	vDirection = normalize(position);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Небо слоями, снизу вверх:
// 1) градиент (горизонт = цвет тумана, чтобы лес сцены растворялся без шва);
// 2) солнце, луна, звёзды;
// 3) облака — поверх светил: звёзды и солнце прячутся за ними;
// 4) силуэт дальнего леса на горизонте во все стороны (два слоя елей).
const fragmentShader = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uMoonDirection;
uniform float uNight;
uniform vec2 uCloudOffset;
uniform float uCloudCover;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uForest;
varying vec3 vDirection;

float hash(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float hash1(float n) {
	return fract(sin(n) * 43758.5453);
}

float hash2(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise1(float x) {
	float i = floor(x);
	float f = fract(x);
	return mix(hash1(i), hash1(i + 1.0), f * f * (3.0 - 2.0 * f));
}

float noise2(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
		mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 0.5;
	for (int i = 0; i < 5; i++) {
		value += amplitude * noise2(p);
		p = p * 2.03 + vec2(17.3, 9.1);
		amplitude *= 0.5;
	}
	return value;
}

/** Зубчатая линия верхушек елей: треугольник на каждую «ель», высота случайна. */
float spruceLine(float x, float seed) {
	float cell = floor(x);
	float f = fract(x);
	float height = 0.45 + 0.55 * hash1(cell * 1.37 + seed);
	float width = 0.55 + 0.4 * hash1(cell * 2.11 + seed);
	float tip = max(0.0, 1.0 - abs(f - 0.5) * 2.0 / width);
	return height * tip;
}

void main() {
	vec3 dir = normalize(vDirection);
	float h = clamp(dir.y, 0.0, 1.0);
	vec3 color = mix(uHorizon, uZenith, pow(h, 0.55));

	// светила и звёзды
	float sunDot = max(dot(dir, uSunDirection), 0.0);
	float sunVisible = smoothstep(-0.15, 0.05, uSunDirection.y);
	vec3 halo = uSunColor * (pow(sunDot, 8.0) * 0.35 + pow(sunDot, 64.0) * 0.6) * sunVisible;
	vec3 disc = uSunColor * smoothstep(0.9995, 0.9998, sunDot) * 4.0 * sunVisible;
	float moonDot = dot(dir, uMoonDirection);
	vec3 moon = vec3(0.85, 0.9, 1.0) * smoothstep(0.9992, 0.9995, moonDot) * 1.5 * uNight;
	vec3 moonGlow = vec3(0.25, 0.3, 0.4) * pow(max(moonDot, 0.0), 32.0) * 0.4 * uNight;
	vec3 cell = floor(dir * 300.0);
	float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.3, dir.y) * smoothstep(0.6, 1.0, uNight);
	float twinkle = 0.6 + 0.4 * hash(cell + 1.0);
	vec3 bodies = disc + moon + vec3(star * twinkle * uNight);
	color += halo + moonGlow;

	// облака: проекция на «потолок» облачного слоя, медленный дрейф по ветру
	vec2 cloudUv = dir.xz / max(dir.y, 0.03) * 0.55 + uCloudOffset;
	float n = fbm(cloudUv * 1.3);
	float density = smoothstep(uCloudCover, uCloudCover + 0.18, n) * smoothstep(0.0, 0.15, dir.y);
	// подсветка облаков со стороны солнца/луны и золотая кайма на закате
	float lightSide = pow(max(dot(dir, uSunDirection), 0.0), 3.0) * sunVisible;
	vec3 cloudColor = mix(uCloudShade, uCloudLit, 0.35 + 0.65 * lightSide);
	cloudColor += uSunColor * pow(sunDot, 12.0) * (1.0 - density) * 0.8 * sunVisible;
	// светила гаснут уже за краем облака, а не просвечивают сквозь него
	bodies *= 1.0 - smoothstep(0.03, 0.4, density);
	color = mix(color + bodies, cloudColor, density * 0.92);

	// дальний лес: два слоя силуэтов, ближний темнее (воздушная перспектива)
	float az = atan(dir.z, dir.x);
	float aa = fwidth(dir.y) * 1.5;
	float farLine = 0.028 + 0.02 * noise1(az * 2.0 + 3.0) + 0.03 * spruceLine(az * 95.0, 1.0);
	float nearLine = 0.012 + 0.025 * noise1(az * 3.5 + 11.0) + 0.045 * spruceLine(az * 60.0, 7.0);
	float farMask = 1.0 - smoothstep(farLine - aa, farLine + aa, dir.y);
	float nearMask = 1.0 - smoothstep(nearLine - aa, nearLine + aa, dir.y);
	color = mix(color, mix(uHorizon, uForest, 0.35), farMask);
	color = mix(color, mix(uHorizon, uForest, 0.6), nearMask);

	gl_FragColor = vec4(color, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

const NIGHT_CLOUD_LIT = new Color("#4a5468");
const NIGHT_CLOUD_SHADE = new Color("#191e29");
const DAY_CLOUD_SHADE = new Color("#8d97a3");
const FOREST_DAY = new Color("#1e3326");
const FOREST_NIGHT = new Color("#05070a");
const WHITE = new Color("#ffffff");
const scratch = new Color();

/** Скорость дрейфа облаков (доли текстуры в секунду) при ветре 1. */
const CLOUD_DRIFT = 0.012;

export function SkyDome() {
	const mesh = useRef<Mesh>(null);
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
					uCloudOffset: { value: new Vector2() },
					uCloudCover: { value: 0.5 },
					uCloudLit: { value: new Color() },
					uCloudShade: { value: new Color() },
					uForest: { value: new Color() },
				},
			}),
		[],
	);

	useFrame(({ camera }, delta) => {
		// небо «на бесконечности»: купол едет вместе с камерой
		mesh.current?.position.copy(camera.position);

		const { timeOfDay: hours, wind } = useSceneStore.getState();
		const palette = paletteAt(hours);
		const u = material.uniforms;
		u.uZenith.value.set(palette.zenith);
		u.uHorizon.value.set(palette.horizon);
		u.uSunColor.value.set(palette.sunColor);
		sunDirection(hours, u.uSunDirection.value);
		moonDirection(hours, u.uMoonDirection.value);
		u.uNight.value = palette.night;

		const dir = windUniforms.uWindDirection.value;
		const drift = CLOUD_DRIFT * (0.3 + wind) * Math.min(delta, 0.1);
		u.uCloudOffset.value.x += dir.x * drift;
		u.uCloudOffset.value.y += dir.y * drift;
		// днём облаков меньше, в сумерках и ночью — гуще
		u.uCloudCover.value = 0.43 - palette.night * 0.04;
		u.uCloudLit.value
			.copy(scratch.set(palette.sunColor).lerp(WHITE, 0.55))
			.lerp(NIGHT_CLOUD_LIT, palette.night);
		u.uCloudShade.value
			.copy(DAY_CLOUD_SHADE)
			.lerp(NIGHT_CLOUD_SHADE, palette.night);
		u.uForest.value.copy(FOREST_DAY).lerp(FOREST_NIGHT, palette.night);
	});

	return (
		<mesh
			ref={mesh}
			material={material}
			scale={400}
			renderOrder={-1}
			frustumCulled={false}
		>
			<sphereGeometry args={[1, 48, 24]} />
		</mesh>
	);
}
