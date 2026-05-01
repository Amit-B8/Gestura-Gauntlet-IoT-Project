import { memo, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"
import { SelectionRing } from "../SelectionRing"
import type { DeviceProps } from "../types"

export const AccentLight = memo(function AccentLight({
  color,
  intensity,
  isSelected,
}: DeviceProps & { color: string; intensity: number }) {
  const neonRef = useRef<THREE.Group>(null)
  const glow = Math.max(0, Math.min(1, intensity))
  const displayColor = useMemo(() => {
    const dimmed = new THREE.Color(color)
    dimmed.multiplyScalar(0.12 + glow * 0.88)
    return `#${dimmed.getHexString()}`
  }, [color, glow])

  useFrame((state) => {
    if (neonRef.current) {
      neonRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.012 * glow)
    }
  })

  return (
    <group position={[4.75, 3.16, -5.02]} ref={neonRef}>
      <Text fontSize={0.9} color={displayColor} anchorX="center" anchorY="middle">
        &lt;/&gt;
      </Text>
      <pointLight position={[0, 0, 0.35]} color={color} intensity={glow * 4.4} distance={5.2} />
      <pointLight position={[-4.1, -1.05, 0.35]} color={color} intensity={glow * 1.75} distance={5.8} />
      <SelectionRing radius={1.0} visible={isSelected} />
    </group>
  )
})
