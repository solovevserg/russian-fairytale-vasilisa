import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import {
	BufferAttribute,
	type MeshStandardMaterial,
	NoColorSpace,
	PlaneGeometry,
	RepeatWrapping,
	SRGBColorSpace,
	type Texture,
} from "three";
import { distanceToPath, heightAt, TERRAIN_SIZE, wildness } from "./terrain";

const SEGMENTS = 220;
/** Размер плитки текстуры земли, м. */
const TILE_METERS = 4;

const base = `${import.meta.env.BASE_URL}textures/ground/`;
const TEXTURES = {
	grassMap: `${base}grass_diff.jpg`,
	forestMap: `${base}forest_diff.jpg`,
	pathMap: `${base}path_diff.jpg`,
	grassNor: `${base}grass_nor.jpg`,
	forestNor: `${base}forest_nor.jpg`,
	pathNor: `${base}path_nor.jpg`,
};

const SPLAT_PARS = /* glsl */ `
uniform sampler2D uGrassMap;
uniform sampler2D uForestMap;
uniform sampler2D uPathMap;
uniform sampler2D uGrassNor;
uniform sampler2D uForestNor;
uniform sampler2D uPathNor;
uniform float uTile;
varying vec3 vSplat;

// Смешивание трёх материалов по весам; каждая текстура берётся в двух
// масштабах — так меньше заметен повтор плитки.
vec4 splat3(sampler2D a, sampler2D b, sampler2D c, vec2 uv) {
	vec2 uv2 = uv * 0.37 + vec2(0.31, 0.71);
	vec3 w = vSplat / max(vSplat.x + vSplat.y + vSplat.z, 1e-3);
	vec4 A = mix(texture2D(a, uv), texture2D(a, uv2), 0.25);
	vec4 B = mix(texture2D(b, uv), texture2D(b, uv2), 0.25);
	vec4 C = mix(texture2D(c, uv), texture2D(c, uv2), 0.25);
	return A * w.x + B * w.y + C * w.z;
}
`;

/** Подключает к MeshStandardMaterial смешивание текстур поляны, леса и тропы. */
function applySplat(
	material: MeshStandardMaterial,
	textures: Record<keyof typeof TEXTURES, Texture>,
) {
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, {
			uGrassMap: { value: textures.grassMap },
			uForestMap: { value: textures.forestMap },
			uPathMap: { value: textures.pathMap },
			uGrassNor: { value: textures.grassNor },
			uForestNor: { value: textures.forestNor },
			uPathNor: { value: textures.pathNor },
			uTile: { value: TERRAIN_SIZE / TILE_METERS },
		});
		shader.vertexShader = shader.vertexShader
			.replace(
				"#include <common>",
				"#include <common>\nattribute vec3 aSplat;\nvarying vec3 vSplat;",
			)
			.replace(
				"#include <begin_vertex>",
				"#include <begin_vertex>\nvSplat = aSplat;",
			);
		shader.fragmentShader = shader.fragmentShader
			.replace("#include <common>", `#include <common>\n${SPLAT_PARS}`)
			.replace(
				"vec4 sampledDiffuseColor = texture2D( map, vMapUv );",
				"vec4 sampledDiffuseColor = splat3(uGrassMap, uForestMap, uPathMap, vMapUv * uTile);",
			)
			.replace(
				"vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
				"vec3 mapN = splat3(uGrassNor, uForestNor, uPathNor, vNormalMapUv * uTile).xyz * 2.0 - 1.0;",
			);
	};
	material.customProgramCacheKey = () => "terrain-splat";
}

export function TerrainMesh() {
	const textures = useTexture(TEXTURES);

	const geometry = useMemo(() => {
		const plane = new PlaneGeometry(
			TERRAIN_SIZE,
			TERRAIN_SIZE,
			SEGMENTS,
			SEGMENTS,
		);
		plane.rotateX(-Math.PI / 2);
		const position = plane.attributes.position;
		const splat = new Float32Array(position.count * 3);
		for (let i = 0; i < position.count; i++) {
			const x = position.getX(i);
			const z = position.getZ(i);
			position.setY(i, heightAt(x, z));

			// поляна — трава, лес — листва и мох пятнами, тропа — утоптанная земля
			const wild = wildness(x, z);
			const patchy =
				Math.sin(x * 0.37 + Math.sin(z * 0.11) * 2) * Math.sin(z * 0.29) * 0.5 +
				0.5;
			const path = 1 - Math.min(distanceToPath(x, z) / 1.8, 1);
			const grass = (1 - wild) * 0.9 + wild * (1 - patchy) * 0.35;
			const forest = wild * (0.4 + patchy * 0.6);
			splat[i * 3] = grass * (1 - path);
			splat[i * 3 + 1] = forest * (1 - path);
			splat[i * 3 + 2] = path * path * 1.6;
		}
		plane.setAttribute("aSplat", new BufferAttribute(splat, 3));
		plane.computeVertexNormals();
		return plane;
	}, []);

	useLayoutEffect(() => {
		for (const [key, texture] of Object.entries(textures)) {
			texture.wrapS = texture.wrapT = RepeatWrapping;
			texture.anisotropy = 8;
			texture.colorSpace = key.endsWith("Map") ? SRGBColorSpace : NoColorSpace;
			texture.needsUpdate = true;
		}
	}, [textures]);

	return (
		<mesh geometry={geometry} receiveShadow>
			<meshStandardMaterial
				// map и normalMap включают нужные ветки шейдера; сами выборки подменяет applySplat
				map={textures.grassMap}
				normalMap={textures.grassNor}
				roughness={1}
				onUpdate={(material) => applySplat(material, textures)}
			/>
		</mesh>
	);
}
