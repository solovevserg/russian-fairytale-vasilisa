import { useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import { layoutForest } from "./forestLayout";

// Заглушка: «ели» из конусов. На этапе 2 заменяются деревьями ez-tree.
export function Forest() {
	const trees = useMemo(
		() =>
			layoutForest({
				seed: 42,
				count: 260,
				clearingRadius: 11,
				outerRadius: 60,
			}),
		[],
	);
	const trunks = useRef<InstancedMesh>(null);
	const crowns = useRef<InstancedMesh>(null);

	useLayoutEffect(() => {
		const dummy = new Object3D();
		trees.forEach((tree, i) => {
			dummy.position.set(tree.x, 1.5 * tree.scale, tree.z);
			dummy.rotation.set(0, tree.rotation, 0);
			dummy.scale.setScalar(tree.scale);
			dummy.updateMatrix();
			trunks.current?.setMatrixAt(i, dummy.matrix);

			dummy.position.y = 6 * tree.scale;
			dummy.updateMatrix();
			crowns.current?.setMatrixAt(i, dummy.matrix);
		});
		if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
		if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
	}, [trees]);

	return (
		<group>
			<instancedMesh
				ref={trunks}
				args={[undefined, undefined, trees.length]}
				castShadow
			>
				<cylinderGeometry args={[0.2, 0.35, 3, 6]} />
				<meshStandardMaterial color="#3b2a1d" roughness={1} />
			</instancedMesh>
			<instancedMesh
				ref={crowns}
				args={[undefined, undefined, trees.length]}
				castShadow
			>
				<coneGeometry args={[2.2, 9, 7]} />
				<meshStandardMaterial color="#1e3324" roughness={0.9} flatShading />
			</instancedMesh>
		</group>
	);
}
