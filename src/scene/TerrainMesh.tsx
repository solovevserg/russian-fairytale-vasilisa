import { useMemo } from "react";
import { BufferAttribute, Color, PlaneGeometry } from "three";
import { distanceToPath, heightAt, TERRAIN_SIZE, wildness } from "./terrain";

const SEGMENTS = 220;

const MOSS = new Color("#3d4a26");
const FOREST_FLOOR = new Color("#2a2a1a");
const CLEARING_GRASS = new Color("#56602f");
const PATH_DIRT = new Color("#5a4630");

export function TerrainMesh() {
	const geometry = useMemo(() => {
		const plane = new PlaneGeometry(
			TERRAIN_SIZE,
			TERRAIN_SIZE,
			SEGMENTS,
			SEGMENTS,
		);
		plane.rotateX(-Math.PI / 2);
		const position = plane.attributes.position;
		const colors = new Float32Array(position.count * 3);
		const color = new Color();
		for (let i = 0; i < position.count; i++) {
			const x = position.getX(i);
			const z = position.getZ(i);
			position.setY(i, heightAt(x, z));

			// поляна — трава, лес — мох и опавшая хвоя, тропа — утоптанная земля
			const wild = wildness(x, z);
			color.copy(CLEARING_GRASS).lerp(MOSS, wild);
			const patchy = Math.sin(x * 0.37) * Math.sin(z * 0.29) * 0.5 + 0.5;
			color.lerp(FOREST_FLOOR, wild * patchy * 0.7);
			const path = 1 - Math.min(distanceToPath(x, z) / 1.6, 1);
			color.lerp(PATH_DIRT, path * 0.9);
			color.toArray(colors, i * 3);
		}
		plane.setAttribute("color", new BufferAttribute(colors, 3));
		plane.computeVertexNormals();
		return plane;
	}, []);

	return (
		<mesh geometry={geometry} receiveShadow>
			<meshStandardMaterial vertexColors roughness={1} />
		</mesh>
	);
}
