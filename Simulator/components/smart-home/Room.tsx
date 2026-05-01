import { memo } from "react"
import { RoundedBox } from "@react-three/drei"
import { SelectionRing } from "./SelectionRing"

export const Room = memo(function Room({
  cornerLedColor,
  cornerLedIntensity,
  tableLampOn,
  tableLampBrightness,
  tableLampColor,
  tableLampSelected,
}: {
  cornerLedColor: string
  cornerLedIntensity: number
  tableLampOn: boolean
  tableLampBrightness: number
  tableLampColor: string
  tableLampSelected: boolean
}) {
  return (
    <group>
      <Architecture />
      <LedMoodLighting color={cornerLedColor} intensity={cornerLedIntensity} />
      <LoungeArea />
      <CoffeeTable
        lampOn={tableLampOn}
        lampBrightness={tableLampBrightness}
        lampColor={tableLampColor}
        lampSelected={tableLampSelected}
      />
      <PlantCluster />
      <ShelfWall />
    </group>
  )
})

function Architecture() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[13, 10.5]} />
        <meshStandardMaterial color="#2d211d" roughness={0.76} metalness={0.06} />
      </mesh>

      {Array.from({ length: 13 }, (_, i) => -5.9 + i * 0.98).map((x, i) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, 0]} receiveShadow>
          <planeGeometry args={[0.035, 10.2]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#402b24" : "#211816"} roughness={0.82} />
        </mesh>
      ))}

      <mesh position={[0, 2.7, -5.15]} receiveShadow>
        <planeGeometry args={[13, 5.4]} />
        <meshStandardMaterial color="#30263c" roughness={0.86} />
      </mesh>

      <mesh position={[-6.5, 2.7, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10.5, 5.4]} />
        <meshStandardMaterial color="#241d34" roughness={0.88} />
      </mesh>

      <mesh position={[6.5, 2.7, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10.5, 5.4]} />
        <meshStandardMaterial color="#372534" roughness={0.86} />
      </mesh>

      <mesh position={[0, 5.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 10.5]} />
        <meshStandardMaterial color="#272236" roughness={0.82} />
      </mesh>

      <Baseboard position={[0, 0.13, -5.1]} args={[12.8, 0.14, 0.08]} />
      <Baseboard position={[-6.45, 0.13, 0]} args={[0.08, 0.14, 10.2]} />
      <Baseboard position={[6.45, 0.13, 0]} args={[0.08, 0.14, 10.2]} />
    </group>
  )
}

function LedMoodLighting({
  color,
  intensity,
}: {
  color: string
  intensity: number
}) {
  const glow = clampUnit(intensity)

  return (
    <group>
      <Strip position={[-3.25, 5.32, -5.03]} args={[6.1, 0.04, 0.035]} color={color} intensity={glow * 2.5} />
      <Strip position={[3.25, 5.32, -5.03]} args={[6.1, 0.04, 0.035]} color={color} intensity={glow * 2.4} />
      <Strip position={[-6.38, 5.31, -0.15]} args={[0.035, 0.04, 9.35]} color={color} intensity={glow * 2.0} />
      <Strip position={[6.38, 5.31, -0.15]} args={[0.035, 0.04, 9.35]} color={color} intensity={glow * 1.9} />

      <pointLight position={[-4.2, 4.7, -4.6]} color={color} intensity={glow * 2.25} distance={7.5} />
      <pointLight position={[3.9, 4.2, -4.4]} color={color} intensity={glow * 2.05} distance={8} />
      <pointLight position={[-4.7, 1.3, -4.65]} color={color} intensity={glow * 1.8} distance={5.5} />
      <pointLight position={[3.6, 1.45, -4.3]} color={color} intensity={glow * 1.4} distance={4.6} />
      <pointLight position={[0, 0.35, 0]} color={color} intensity={glow * 1.2} distance={10} />
    </group>
  )
}

function LoungeArea() {
  return (
    <group>
      <RoundedBox args={[4.9, 0.05, 3.25]} position={[-0.7, 0.035, 1.55]} radius={0.08} receiveShadow>
        <meshStandardMaterial color="#32263a" roughness={0.96} />
      </RoundedBox>

      <group position={[1.05, 0.55, 2.95]}>
        <RoundedBox args={[4.25, 0.62, 1.0]} position={[0, 0.24, 0]} radius={0.12} castShadow receiveShadow>
          <meshStandardMaterial color="#2a2029" roughness={0.72} />
        </RoundedBox>
        <RoundedBox args={[4.4, 1.0, 0.35]} position={[0, 0.72, 0.48]} radius={0.12} castShadow>
          <meshStandardMaterial color="#302530" roughness={0.78} />
        </RoundedBox>
        <RoundedBox args={[0.35, 0.82, 1.05]} position={[-2.28, 0.48, 0]} radius={0.12} castShadow>
          <meshStandardMaterial color="#2d222b" roughness={0.78} />
        </RoundedBox>
        <RoundedBox args={[0.35, 0.82, 1.05]} position={[2.28, 0.48, 0]} radius={0.12} castShadow>
          <meshStandardMaterial color="#2d222b" roughness={0.78} />
        </RoundedBox>
      </group>
    </group>
  )
}

function CoffeeTable({
  lampOn,
  lampBrightness,
  lampColor,
  lampSelected,
}: {
  lampOn: boolean
  lampBrightness: number
  lampColor: string
  lampSelected: boolean
}) {
  return (
    <group position={[-1.05, 0, 0.75]}>
      <RoundedBox args={[2.45, 0.12, 1.22]} position={[0, 0.48, 0]} radius={0.045} castShadow receiveShadow>
        <meshStandardMaterial color="#2b1c18" roughness={0.55} metalness={0.08} />
      </RoundedBox>
      {[-1.06, 1.06].map((x) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.24, z]} castShadow>
            <boxGeometry args={[0.07, 0.48, 0.07]} />
            <meshStandardMaterial color="#121018" roughness={0.4} metalness={0.35} />
          </mesh>
        )),
      )}
      <TableLamp
        position={[0.42, 0.61, -0.12]}
        isOn={lampOn}
        brightness={lampBrightness}
        color={lampColor}
        isSelected={lampSelected}
      />
      <RoundedBox args={[0.28, 0.16, 0.28]} position={[-0.38, 0.63, 0.15]} radius={0.045} castShadow>
        <meshStandardMaterial color="#243b32" roughness={0.72} />
      </RoundedBox>
      <PlantLeaves base={[-0.38, 0.76, 0.15]} scale={0.28} />
    </group>
  )
}

function TableLamp({
  position,
  isOn,
  brightness,
  color,
  isSelected,
}: {
  position: [number, number, number]
  isOn: boolean
  brightness: number
  color: string
  isSelected: boolean
}) {
  const glow = isOn ? clampUnit(brightness) : 0

  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.22, 0.06, 28]} />
        <meshStandardMaterial color="#141018" roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.36, 14]} />
        <meshStandardMaterial color="#2b2530" roughness={0.32} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <coneGeometry args={[0.2, 0.26, 24, 1, true]} />
        <meshStandardMaterial color="#241e27" roughness={0.42} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <sphereGeometry args={[0.065, 18, 12]} />
        <meshStandardMaterial color="#fff1cf" emissive={color} emissiveIntensity={glow * 2.3} roughness={0.2} />
      </mesh>
      <pointLight position={[0, 0.42, 0]} color={color} intensity={glow * 2.2} distance={3.4} />
      <SelectionRing radius={0.34} visible={isSelected} />
    </group>
  )
}

function PlantCluster() {
  return (
    <group>
      <PlantPot position={[-5.9, 0.34, -2.1]} scale={0.85} tall />
      <PlantPot position={[-4.45, 0.28, -3.95]} scale={0.4} />
      <PlantPot position={[3.3, 0.32, -3.85]} scale={0.55} />
      <PlantPot position={[4.55, 1.62, -4.84]} scale={0.36} />
    </group>
  )
}

function ShelfWall() {
  return (
    <group position={[3.55, 0, -4.88]}>
      {[-1.1, 0, 1.1].map((x) => (
        <mesh key={`post-${x}`} position={[x, 1.55, 0]}>
          <boxGeometry args={[0.055, 2.8, 0.08]} />
          <meshStandardMaterial color="#121018" roughness={0.4} metalness={0.45} />
        </mesh>
      ))}
      {[0.55, 1.28, 2.0, 2.72].map((y) => (
        <RoundedBox key={y} args={[2.35, 0.08, 0.42]} position={[0, y, 0.02]} radius={0.018} castShadow receiveShadow>
          <meshStandardMaterial color="#3a241e" roughness={0.55} />
        </RoundedBox>
      ))}
      <PlantPot position={[-0.65, 1.47, 0.04]} scale={0.28} />
      <PlantPot position={[0.25, 2.2, 0.04]} scale={0.25} />
      <RoundedBox args={[0.42, 0.42, 0.36]} position={[0.62, 0.83, 0.05]} radius={0.03} castShadow>
        <meshStandardMaterial color="#111522" roughness={0.42} />
      </RoundedBox>
      <mesh position={[0.62, 0.86, 0.24]}>
        <sphereGeometry args={[0.17, 28, 16]} />
        <meshStandardMaterial color="#ff9147" metalness={0.65} roughness={0.22} emissive="#8a2f15" emissiveIntensity={0.22} />
      </mesh>
      {[-0.05, 0.1, 0.24].map((x, i) => (
        <RoundedBox key={x} args={[0.15, 0.62 - i * 0.1, 0.26]} position={[x, 2.33, 0.04]} radius={0.014} castShadow>
          <meshStandardMaterial color={["#271f2c", "#4c3141", "#b88957"][i]} roughness={0.68} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.42, 0.18, 0.28]} position={[-0.58, 2.9, 0.04]} radius={0.02} castShadow>
        <meshStandardMaterial color="#a9825a" roughness={0.62} />
      </RoundedBox>
    </group>
  )
}

function PlantPot({
  position,
  scale = 1,
  tall = false,
}: {
  position: [number, number, number]
  scale?: number
  tall?: boolean
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.48, 24]} />
        <meshStandardMaterial color="#3b2a24" roughness={0.72} />
      </mesh>
      <PlantLeaves base={[0, tall ? 0.62 : 0.42, 0]} scale={tall ? 1.05 : 0.62} />
    </group>
  )
}

function PlantLeaves({ base, scale = 1 }: { base: [number, number, number]; scale?: number }) {
  return (
    <group position={base} scale={scale}>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const radius = 0.16 + (i % 3) * 0.05
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, 0.05 + (i % 4) * 0.045, Math.sin(angle) * radius]}
            rotation={[0.55, angle, 0.15]}
            castShadow
          >
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#1f5a3b" : "#2f7a4c"} roughness={0.75} />
          </mesh>
        )
      })}
    </group>
  )
}

function Strip({
  position,
  args,
  color,
  intensity,
}: {
  position: [number, number, number]
  args: [number, number, number]
  color: string
  intensity: number
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.18} />
    </mesh>
  )
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value))
}

function Baseboard({
  position,
  args,
}: {
  position: [number, number, number]
  args: [number, number, number]
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#ead7bc" roughness={0.68} />
    </mesh>
  )
}
