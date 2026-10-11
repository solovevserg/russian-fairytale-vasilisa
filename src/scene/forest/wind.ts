import {type Material, Vector2} from "three";

/** Общие юниформы ветра: один объект на всю сцену, обновляется раз в кадр. */
export const windUniforms = {
	uTime: {value: 0},
	/** Амплитуда качания макушки дерева, метры. */
	uWindStrength: {value: 0.5},
	uWindFrequency: {value: 0.9},
	uWindDirection: {value: new Vector2(1, 0.4).normalize()},
};

export type WindKind = "bark" | "leaves";

const WIND_PARS = /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
uniform float uWindFrequency;
uniform vec2 uWindDirection;
uniform float uTreeHeight;
`;

// Заменяет стандартный project_vertex: те же вычисления плюс смещение от ветра.
// В отличие от встроенного ветра ez-tree, учитывает instanceMatrix
// и качает всё дерево целиком (ствол и ветви гнутся сильнее к макушке).
const WIND_PROJECT_VERTEX = /* glsl */ `
vec4 windLocal = vec4(transformed, 1.0);
vec4 windOrigin = vec4(0.0, 0.0, 0.0, 1.0);
#ifdef USE_INSTANCING
	windLocal = instanceMatrix * windLocal;
	windOrigin = instanceMatrix * windOrigin;
#endif
vec4 windWorld = modelMatrix * windLocal;
windOrigin = modelMatrix * windOrigin;

// высота точки относительно своего дерева: 0 у корня, 1 у макушки
float windHeight = clamp(transformed.y / uTreeHeight, 0.0, 1.0);
float windPhase = dot(windOrigin.xz, vec2(0.071, 0.113)) * 6.2831;
float windT = uTime * uWindFrequency;

// медленное качание всего дерева + порывы, бегущие по лесу волной
float gust = 0.6 + 0.4 * sin(windT * 0.31 + dot(windOrigin.xz, uWindDirection) * 0.05);
float sway = (0.65 * sin(windT + windPhase) + 0.35 * sin(windT * 2.17 + windPhase * 1.3)) * gust;
vec3 windOffset = vec3(uWindDirection.x, 0.0, uWindDirection.y)
	* (sway + 0.5 * gust) * uWindStrength * windHeight * windHeight;

#ifdef WIND_LEAVES
	// трепет листвы: быстрые мелкие колебания, кончик листа (uv.y = 1) двигается сильнее
	float flutter = sin(uTime * 6.0 + dot(windWorld.xyz, vec3(1.7, 1.1, 1.3)));
	windOffset += vec3(0.6, 0.35, 0.6) * flutter * uv.y * 0.06 * (0.5 + uWindStrength) * gust;
#endif

windWorld.xyz += windOffset;
vec4 mvPosition = viewMatrix * windWorld;
gl_Position = projectionMatrix * mvPosition;
`;

/**
 * Добавляет к материалу дерева анимацию ветра. Работает и для обычных мешей,
 * и для InstancedMesh, и для материалов глубины (тени качаются вместе с деревом).
 */
export function applyWind(
	material: Material,
	kind: WindKind,
	treeHeight: number,
): void {
	material.defines = {
		...material.defines,
		...(kind === "leaves" ? {WIND_LEAVES: ""} : {}),
	};
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, windUniforms, {
			uTreeHeight: {value: treeHeight},
		});
		shader.vertexShader = shader.vertexShader
			.replace("#include <common>", `#include <common>\n${WIND_PARS}`)
			.replace("#include <project_vertex>", WIND_PROJECT_VERTEX);
	};
	material.customProgramCacheKey = () =>
		`wind-${kind}-${treeHeight.toFixed(2)}`;
}
