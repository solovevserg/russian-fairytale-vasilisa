import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import {
	DataTexture,
	LinearFilter,
	LinearMipmapLinearFilter,
	type MeshStandardMaterial,
	NoColorSpace,
	PlaneGeometry,
	RepeatWrapping,
	RGBAFormat,
	ShaderChunk,
	SRGBColorSpace,
	type Texture,
} from "three";
import { heightAt, TERRAIN_SIZE } from "./terrain";
import { buildSplatMask } from "./terrainSplat";

const SEGMENTS = 220;
/** Размер плитки текстуры земли, м. */
const TILE_METERS = 3.5;
/** Разрешение маски весов: 1024 на 180 м — ~17 см на тексель. */
const MASK_SIZE = 1024;

const base = `${import.meta.env.BASE_URL}textures/ground/`;
const TEXTURES = {
	grassMap: `${base}grass_diff.webp`,
	forestMap: `${base}forest_diff.webp`,
	pathMap: `${base}path_diff.webp`,
	grassNor: `${base}grass_nor.webp`,
	forestNor: `${base}forest_nor.webp`,
	pathNor: `${base}path_nor.webp`,
};

const SPLAT_PARS = /* glsl */ `
uniform sampler2D uSplat;
uniform sampler2D uGrassMap;
uniform sampler2D uForestMap;
uniform sampler2D uPathMap;
uniform sampler2D uGrassNor;
uniform sampler2D uForestNor;
uniform sampler2D uPathNor;
uniform float uTile;
vec3 splatW;

// Текстура в двух масштабах — меньше заметен повтор плитки.
vec4 sampleTiled(sampler2D tex, vec2 uv) {
	return mix(texture2D(tex, uv), texture2D(tex, uv * 0.37 + vec2(0.31, 0.71)), 0.25);
}

// Смешивание «по высоте»: яркость текстуры как рельеф — камешки тропы
// проступают сквозь траву неровным краем, а не плавным градиентом.
vec3 heightBlend(vec3 w, vec3 h) {
	vec3 hw = w + h * 0.5 * step(0.001, w);
	float top = max(max(hw.x, hw.y), hw.z) - 0.18;
	vec3 b = max(hw - top, 0.0);
	return b / max(b.x + b.y + b.z, 1e-4);
}
`;

const MAP_FRAGMENT = /* glsl */ `
	vec2 tileUv = vMapUv * uTile;
	// текстура Sparse Grass суховата — чуть подзеленим поляну
	vec4 grassC = sampleTiled(uGrassMap, tileUv) * vec4(0.88, 1.06, 0.8, 1.0);
	vec4 forestC = sampleTiled(uForestMap, tileUv);
	vec4 pathC = sampleTiled(uPathMap, tileUv);
	vec3 lum = vec3(0.299, 0.587, 0.114);
	splatW = heightBlend(
		texture2D(uSplat, vMapUv).rgb,
		vec3(dot(grassC.rgb, lum), dot(forestC.rgb, lum), dot(pathC.rgb, lum))
	);
	vec4 sampledDiffuseColor = grassC * splatW.x + forestC * splatW.y + pathC * splatW.z;
`;

const NORMAL_FRAGMENT = /* glsl */ `
	vec2 norUv = vNormalMapUv * uTile;
	vec3 mapN = (
		sampleTiled(uGrassNor, norUv).xyz * splatW.x +
		sampleTiled(uForestNor, norUv).xyz * splatW.y +
		sampleTiled(uPathNor, norUv).xyz * splatW.z
	) * 2.0 - 1.0;
`;

const MAP_LINE = "vec4 sampledDiffuseColor = texture2D( map, vMapUv );";
const NORMAL_LINE =
	"vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;";

/** Заменяет строку в куске шейдера; если строки нет (сменилась версия three) — громко падаем. */
function patchChunk(chunk: string, line: string, replacement: string): string {
	if (!chunk.includes(line)) {
		throw new Error(`Terrain shader: строка не найдена в ShaderChunk: ${line}`);
	}
	return chunk.replace(line, replacement);
}

/** Подключает к MeshStandardMaterial смешивание текстур поляны, леса и тропы. */
function applySplat(
	material: MeshStandardMaterial,
	textures: Record<keyof typeof TEXTURES, Texture>,
	mask: DataTexture,
) {
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, {
			uSplat: { value: mask },
			uGrassMap: { value: textures.grassMap },
			uForestMap: { value: textures.forestMap },
			uPathMap: { value: textures.pathMap },
			uGrassNor: { value: textures.grassNor },
			uForestNor: { value: textures.forestNor },
			uPathNor: { value: textures.pathNor },
			uTile: { value: TERRAIN_SIZE / TILE_METERS },
		});
		// В onBeforeCompile шейдер ещё содержит директивы #include, поэтому
		// подменяем сами директивы изменёнными копиями нужных кусков ShaderChunk.
		shader.fragmentShader = shader.fragmentShader
			.replace("#include <common>", `#include <common>\n${SPLAT_PARS}`)
			.replace(
				"#include <map_fragment>",
				patchChunk(ShaderChunk.map_fragment, MAP_LINE, MAP_FRAGMENT),
			)
			.replace(
				"#include <normal_fragment_maps>",
				patchChunk(
					ShaderChunk.normal_fragment_maps,
					NORMAL_LINE,
					NORMAL_FRAGMENT,
				),
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
		for (let i = 0; i < position.count; i++) {
			position.setY(i, heightAt(position.getX(i), position.getZ(i)));
		}
		plane.computeVertexNormals();
		return plane;
	}, []);

	const mask = useMemo(() => {
		const texture = new DataTexture(
			buildSplatMask(MASK_SIZE),
			MASK_SIZE,
			MASK_SIZE,
			RGBAFormat,
		);
		texture.magFilter = LinearFilter;
		texture.minFilter = LinearMipmapLinearFilter;
		texture.generateMipmaps = true;
		texture.needsUpdate = true;
		return texture;
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
				onUpdate={(material) => applySplat(material, textures, mask)}
			/>
		</mesh>
	);
}
