import { useLayoutEffect, useMemo, useRef } from "react";
import {
	BufferGeometry,
	Color,
	DoubleSide,
	Float32BufferAttribute,
	type InstancedMesh,
	MeshStandardMaterial,
	Object3D,
} from "three";
import { windUniforms } from "../forest/wind";
import { createRandom } from "../random";
import { type PlantPlacement, scatter } from "./layout";

/**
 * Пучок травы: `blades` изогнутых травинок по 3 треугольника. В uv.y — высота
 * точки по травинке (0 у корня, 1 на кончике): по ней шейдер качает и красит.
 */
export function tuftGeometry({
	blades,
	height,
	width,
	spread,
	seed,
}: {
	blades: number;
	height: number;
	width: number;
	spread: number;
	seed: number;
}): BufferGeometry {
	const random = createRandom(seed);
	const positions: number[] = [];
	const uvs: number[] = [];
	const normals: number[] = [];
	const indices: number[] = [];
	for (let b = 0; b < blades; b++) {
		const angle = random() * Math.PI * 2;
		const lean = 0.15 + random() * 0.45;
		const h = height * (0.6 + random() * 0.5);
		const ox = (random() - 0.5) * spread;
		const oz = (random() - 0.5) * spread;
		const dx = Math.cos(angle);
		const dz = Math.sin(angle);
		// поперёк травинки
		const px = -dz * width * 0.5;
		const pz = dx * width * 0.5;
		const start = positions.length / 3;
		// 2 точки у корня, 2 посередине, 1 кончик; травинка выгибается наружу
		const rows: [number, number][] = [
			[0, 1],
			[0.55, 0.65],
			[1, 0],
		];
		for (const [t, w] of rows) {
			const bend = lean * t * t * h;
			const cx = ox + dx * bend;
			const cz = oz + dz * bend;
			const y = t * h;
			if (w > 0) {
				positions.push(
					cx - px * w,
					y,
					cz - pz * w,
					cx + px * w,
					y,
					cz + pz * w,
				);
				uvs.push(0, t, 1, t);
				normals.push(0, 1, 0, 0, 1, 0);
			} else {
				positions.push(cx, y, cz);
				uvs.push(0.5, 1);
				normals.push(0, 1, 0);
			}
		}
		indices.push(
			start,
			start + 1,
			start + 2,
			start + 1,
			start + 3,
			start + 2,
			start + 2,
			start + 3,
			start + 4,
		);
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(positions, 3));
	g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
	// нормали «вверх»: трава освещается как земля, без мерцания граней
	g.setAttribute("normal", new Float32BufferAttribute(normals, 3));
	g.setIndex(indices);
	g.computeBoundingSphere();
	return g;
}

const GRASS_VERTEX = /* glsl */ `
vec4 grassLocal = vec4(transformed, 1.0);
vec4 grassOrigin = vec4(0.0, 0.0, 0.0, 1.0);
#ifdef USE_INSTANCING
	grassLocal = instanceMatrix * grassLocal;
	grassOrigin = instanceMatrix * grassOrigin;
#endif
vec4 grassWorld = modelMatrix * grassLocal;
grassOrigin = modelMatrix * grassOrigin;
float tip = uv.y * uv.y;
float phase = dot(grassOrigin.xz, vec2(0.37, 0.61));
float wave = sin(uTime * 1.7 + dot(grassOrigin.xz, uWindDirection) * 0.35) * 0.6
	+ sin(uTime * 3.1 + phase) * 0.25;
grassWorld.xz += uWindDirection * (wave + 0.4) * uWindStrength * 0.35 * tip;
vec4 mvPosition = viewMatrix * grassWorld;
gl_Position = projectionMatrix * mvPosition;
`;

/** Материал травы: ветер + темнее у корня, светлее к кончику. */
function grassMaterial(
	tipColor: string,
	rootColor: string,
): MeshStandardMaterial {
	const material = new MeshStandardMaterial({
		color: "#ffffff",
		roughness: 0.9,
		side: DoubleSide,
	});
	const tip = new Color(tipColor);
	const root = new Color(rootColor);
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, windUniforms, {
			uTipColor: { value: tip },
			uRootColor: { value: root },
		});
		shader.vertexShader = shader.vertexShader
			.replace(
				"#include <common>",
				"#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nuniform vec2 uWindDirection;\nvarying float vGrassHeight;",
			)
			.replace(
				"#include <project_vertex>",
				`${GRASS_VERTEX}\nvGrassHeight = uv.y;`,
			);
		shader.fragmentShader = shader.fragmentShader
			.replace(
				"#include <common>",
				"#include <common>\nuniform vec3 uTipColor;\nuniform vec3 uRootColor;\nvarying float vGrassHeight;",
			)
			// у двусторонней травинки three.js разворачивает нормаль изнанки вниз —
			// изнанка становится чёрной; оставляем нормаль «вверх» для обеих сторон
			.replace(
				"#include <normal_fragment_begin>",
				"#include <normal_fragment_begin>\nnormal = normalize(vNormal);",
			)
			.replace(
				"#include <color_fragment>",
				"#include <color_fragment>\ndiffuseColor.rgb *= mix(uRootColor, uTipColor, vGrassHeight);",
			);
	};
	material.customProgramCacheKey = () => `grass-${tipColor}-${rootColor}`;
	return material;
}

const CHUNK = 15;

function chunked(plants: PlantPlacement[]): PlantPlacement[][] {
	const chunks = new Map<string, PlantPlacement[]>();
	for (const p of plants) {
		const key = `${Math.floor(p.x / CHUNK)}:${Math.floor(p.z / CHUNK)}`;
		const list = chunks.get(key) ?? [];
		list.push(p);
		chunks.set(key, list);
	}
	return [...chunks.values()];
}

function GrassChunk({
	plants,
	geometry,
	material,
}: {
	plants: PlantPlacement[];
	geometry: BufferGeometry;
	material: MeshStandardMaterial;
}) {
	const mesh = useRef<InstancedMesh>(null);
	useLayoutEffect(() => {
		const m = mesh.current;
		if (!m) return;
		const dummy = new Object3D();
		const color = new Color();
		plants.forEach((p, i) => {
			dummy.position.set(p.x, p.y - 0.02, p.z);
			dummy.rotation.set(0, p.rotation, 0);
			dummy.scale.setScalar(p.scale);
			dummy.updateMatrix();
			m.setMatrixAt(i, dummy.matrix);
			// вариация оттенка: от сочного к выгоревшему
			color.setHSL(
				0.22 + p.tint * 0.06,
				0.45 + p.tint * 0.2,
				0.75 + p.tint * 0.25,
			);
			m.setColorAt(i, color);
		});
		m.instanceMatrix.needsUpdate = true;
		if (m.instanceColor) m.instanceColor.needsUpdate = true;
		m.computeBoundingSphere();
	}, [plants]);
	return (
		<instancedMesh
			ref={mesh}
			args={[geometry, material, plants.length]}
			receiveShadow
		/>
	);
}

export interface GrassFieldProps {
	seed: number;
	radius: number;
	spacing: number;
	density: (x: number, z: number) => number;
	scale: [number, number];
	tuft: Parameters<typeof tuftGeometry>[0];
	tipColor: string;
	rootColor: string;
}

/** Поле травы: пучки раскиданы по плотности и разбиты на участки для отсечения. */
export function GrassField({
	seed,
	radius,
	spacing,
	density,
	scale,
	tuft,
	tipColor,
	rootColor,
}: GrassFieldProps) {
	const chunks = useMemo(
		() => chunked(scatter({ seed, radius, spacing, density, scale })),
		[seed, radius, spacing, density, scale],
	);
	const geometry = useMemo(() => tuftGeometry(tuft), [tuft]);
	const material = useMemo(
		() => grassMaterial(tipColor, rootColor),
		[tipColor, rootColor],
	);
	return (
		<group>
			{chunks.map((plants) => (
				<GrassChunk
					key={`${Math.floor(plants[0].x / CHUNK)}:${Math.floor(plants[0].z / CHUNK)}`}
					plants={plants}
					geometry={geometry}
					material={material}
				/>
			))}
		</group>
	);
}
