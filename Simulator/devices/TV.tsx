"use client"

import React, { memo } from "react"
import { SelectionRing } from "../shared/SelectionRing"
import { Html } from "@react-three/drei"
import type { DeviceProps } from "../types"

export const TV = memo(function TV({
  isOn,
  brightness,
  isSelected,
}: DeviceProps & { isOn: boolean; brightness: number }) {
  return (
    <group position={[0, 1.5, -4]}>
      {/* TV Frame */}
      <mesh>
        <boxGeometry args={[2, 1.2, 0.1]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* TV Screen Plane */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1.8, 1]} />
        <meshStandardMaterial
          color={isOn ? "#ffffff" : "#000000"}
          emissive={isOn ? "#ffffff" : "#000000"}
          emissiveIntensity={isOn ? brightness : 0}
          transparent={isOn}
          opacity={isOn ? 0.05 : 1}
        />
        
        {isOn && (
          <Html
            transform
            position={[0, 0, 0.05]}
            distanceFactor={1.2}
            style={{
              width: '180px',
              height: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <img 
              src="/southpark.gif" 
              alt="TV Content" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
              }} 
            />
          </Html>
        )}
      </mesh>

      <SelectionRing radius={1.2} visible={isSelected} />
    </group>
  )
})
