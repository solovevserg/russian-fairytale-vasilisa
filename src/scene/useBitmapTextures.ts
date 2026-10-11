import {useLoader} from "@react-three/fiber";
import {useMemo} from "react";
import {ImageBitmapLoader, Texture} from "three";

/**
 * Декодирование как у TextureLoader (переворот по Y, без домножения альфы и
 * без цветовой коррекции браузера), но заранее и вне главного потока.
 */
const OPTIONS = {
	imageOrientation: "flipY",
	premultiplyAlpha: "none",
	colorSpaceConversion: "none",
} as const;

const configure = (loader: ImageBitmapLoader) => {
	loader.setOptions(OPTIONS);
};

const textures = new WeakMap<ImageBitmap, Texture>();

function textureOf(bitmap: ImageBitmap): Texture {
	let texture = textures.get(bitmap);
	if (!texture) {
		texture = new Texture(bitmap);
		// уже перевёрнуто при декодировании (OPTIONS.imageOrientation)
		texture.flipY = false;
		texture.needsUpdate = true;
		textures.set(bitmap, texture);
	}
	return texture;
}

/**
 * Текстуры из картинок, декодированных через createImageBitmap — в фоне, а
 * не на главном потоке при загрузке в видеокарту (с TextureLoader картинка
 * декодируется именно тогда: текстуры 2K замораживали первый кадр).
 * Приостанавливает компонент, пока не загрузится (нужен Suspense).
 */
export function useBitmapTextures<K extends string>(
	urls: Record<K, string>,
): Record<K, Texture> {
	const keys = Object.keys(urls) as K[];
	const bitmaps = useLoader(
		ImageBitmapLoader,
		keys.map((key) => urls[key]),
		configure,
	) as ImageBitmap[];
	// biome-ignore lint/correctness/useExhaustiveDependencies: ключи — из тех же urls, что и картинки
	return useMemo(
		() =>
			Object.fromEntries(
				keys.map((key, i) => [key, textureOf(bitmaps[i])]),
			) as Record<K, Texture>,
		[bitmaps],
	);
}

/** Начинает загрузку и декодирование заранее — до монтирования сцены. */
useBitmapTextures.preload = (urls: Record<string, string>) => {
	useLoader.preload(ImageBitmapLoader, Object.values(urls), configure);
};
