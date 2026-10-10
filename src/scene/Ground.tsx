export function Ground() {
	return (
		<mesh rotation-x={-Math.PI / 2} receiveShadow>
			<circleGeometry args={[90, 64]} />
			<meshStandardMaterial color="#2f3a22" roughness={1} />
		</mesh>
	);
}
