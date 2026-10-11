import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	NormalBlending,
	type PerspectiveCamera,
	ShaderMaterial,
	Vector3,
} from "three";

import { createRandom } from "../../lib/random";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uLife;
uniform float uRise;
uniform float uSpread;
uniform float uSize;
uniform float uGrow;
uniform float uScale;
uniform vec3 uDrift;
attribute float aSeed;
attribute vec3 aOffset;
varying float vAlpha;

void main() {
	float age = fract(uTime / uLife + aSeed);
	vec3 p = aOffset * uSpread * (0.3 + age);
	p.y += age * uRise;
	p += uDrift * age * age;
	vec4 mv = modelViewMatrix * vec4(p, 1.0);
	gl_Position = projectionMatrix * mv;
	gl_PointSize = uSize * (1.0 + age * uGrow) * uScale / -mv.z;
	vAlpha = smoothstep(0.0, 0.12, age) * (1.0 - age);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;

void main() {
	float d = length(gl_PointCoord - 0.5);
	float alpha = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
	if (alpha < 0.003) discard;
	gl_FragColor = vec4(uColor, alpha);
}
`;

export interface RisingParticlesProps {
	count: number;
	/** Время жизни частицы, с */
	life: number;
	/** Высота подъёма за жизнь, м */
	rise: number;
	/** Разброс по горизонтали, м */
	spread: number;
	/** Размер частицы в начале жизни, м */
	size: number;
	/** Во сколько раз частица вырастает к концу жизни */
	grow: number;
	color: string;
	additive?: boolean;
	seed?: number;
	/** Каждый кадр: прозрачность, цвет, снос ветром. */
	update?: (uniforms: ParticleUniforms) => void;
}

export interface ParticleUniforms {
	uOpacity: { value: number };
	uColor: { value: Color };
	uDrift: { value: Vector3 };
}

/** Частицы, поднимающиеся из точки: дым из трубы, волшебные искры. */
export function RisingParticles({
	count,
	life,
	rise,
	spread,
	size,
	grow,
	color,
	additive = false,
	seed = 1,
	update,
}: RisingParticlesProps) {
	const geometry = useMemo(() => {
		const random = createRandom(seed);
		const seeds = new Float32Array(count);
		const offsets = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			seeds[i] = random();
			offsets[i * 3] = random() * 2 - 1;
			offsets[i * 3 + 1] = (random() * 2 - 1) * 0.3;
			offsets[i * 3 + 2] = random() * 2 - 1;
		}
		const g = new BufferGeometry();
		// позиции считает шейдер; атрибут нужен three.js для числа вершин
		g.setAttribute(
			"position",
			new BufferAttribute(new Float32Array(count * 3), 3),
		);
		g.setAttribute("aSeed", new BufferAttribute(seeds, 1));
		g.setAttribute("aOffset", new BufferAttribute(offsets, 3));
		return g;
	}, [count, seed]);

	const material = useMemo(
		() =>
			new ShaderMaterial({
				vertexShader,
				fragmentShader,
				transparent: true,
				depthWrite: false,
				blending: additive ? AdditiveBlending : NormalBlending,
				uniforms: {
					uTime: { value: 0 },
					uLife: { value: life },
					uRise: { value: rise },
					uSpread: { value: spread },
					uSize: { value: size },
					uGrow: { value: grow },
					uScale: { value: 1 },
					uDrift: { value: new Vector3() },
					uColor: { value: new Color(color) },
					uOpacity: { value: 1 },
				},
			}),
		[additive, life, rise, spread, size, grow, color],
	);

	useFrame(({ camera, size: viewport, gl }, delta) => {
		const u = material.uniforms;
		u.uTime.value += delta;
		// перевод размера в метрах в пиксели: высота вьюпорта / (2·tg(fov/2))
		const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
		u.uScale.value =
			(viewport.height * gl.getPixelRatio()) / (2 * Math.tan(fov / 2));
		update?.(u as unknown as ParticleUniforms);
	});

	return (
		<points geometry={geometry} material={material} frustumCulled={false} />
	);
}
