import {ImageBitmapLoader, Texture} from "three";

/**
 * Загрузчик текстур для ez-tree вместо TextureLoader (подставляется при
 * сборке, scripts/vite/ezTreeTextures.ts): картинки декодируются через
 * createImageBitmap — в фоне, а не на главном потоке при загрузке в
 * видеокарту (с TextureLoader кора и листва замораживали старт на ~0,8 с
 * при CPU ×4).
 *
 * Как у TextureLoader: текстура возвращается сразу, картинка появляется в ней
 * по загрузке. Переворот по Y и домножение альфы (ez-tree ставит
 * premultiplyAlpha) — при декодировании: флаги загрузки WebGL на ImageBitmap
 * не действуют.
 */
export function createBitmapTextureLoader(): {load(url: string): Texture} {
	const loader = new ImageBitmapLoader().setOptions({
		imageOrientation: "flipY",
		premultiplyAlpha: "premultiply",
		colorSpaceConversion: "none",
	});
	return {
		load(url) {
			const texture = new Texture();
			texture.flipY = false;
			loader.load(url, (bitmap) => {
				texture.image = bitmap;
				texture.needsUpdate = true;
			});
			return texture;
		},
	};
}
