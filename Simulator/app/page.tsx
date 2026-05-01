"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { ControlPanel } from "@/components/controls/ControlPanel"
import { DeviceSelector } from "@/components/controls/DeviceSelector"
import type { SmartHomeSceneProps } from "@/components/smart-home/types"
import type { DeviceStateSnapshot } from "@/lib/simulator-api"

// Dynamic import to avoid SSR issues with Three.js
const SmartHomeScene = dynamic(() => import("@/components/smart-home/SmartHomeScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a12]">
      <div className="text-muted-foreground">Loading 3D scene...</div>
    </div>
  ),
})

type DeviceKey = NonNullable<SmartHomeSceneProps["selectedDevice"]>
type ApiControlKey = Exclude<keyof SmartHomeSceneProps, "selectedDevice">

const API_CONTROL_MAP: Partial<Record<ApiControlKey, { deviceId: string; capabilityId: string }>> = {
  tableLampOn: { deviceId: "sim-table-lamp", capabilityId: "power" },
  tableLampBrightness: { deviceId: "sim-table-lamp", capabilityId: "brightness" },
  tableLampColor: { deviceId: "sim-table-lamp", capabilityId: "color" },
  cornerLedColor: { deviceId: "sim-corner-leds", capabilityId: "color" },
  cornerLedIntensity: { deviceId: "sim-corner-leds", capabilityId: "intensity" },
  accentLightColor: { deviceId: "sim-accent-light", capabilityId: "color" },
  accentLightIntensity: { deviceId: "sim-accent-light", capabilityId: "intensity" },
  tvOn: { deviceId: "sim-tv", capabilityId: "power" },
  thermostatOn: { deviceId: "sim-thermostat", capabilityId: "power" },
  thermostatTemp: { deviceId: "sim-thermostat", capabilityId: "temperature" },
  thermostatMode: { deviceId: "sim-thermostat", capabilityId: "mode" },
}

const DEFAULT_STATE: SmartHomeSceneProps = {
  tableLampOn: true,
  tableLampBrightness: 0.7,
  tableLampColor: "#ffb763",
  cornerLedColor: "#ff00ff",
  cornerLedIntensity: 0.5,
  accentLightColor: "#43ecff",
  accentLightIntensity: 0.65,
  tvOn: true,
  thermostatOn: true,
  thermostatTemp: 72,
  thermostatMode: "cool",
  selectedDevice: null,
}

export default function SmartHomeDemoPage() {
  const [state, setState] = useState<SmartHomeSceneProps>(DEFAULT_STATE)

  const handleChange = useCallback(
    <K extends keyof SmartHomeSceneProps>(key: K, value: SmartHomeSceneProps[K]) => {
      setState((prev) => ({ ...prev, [key]: value }))

      const apiTarget = API_CONTROL_MAP[key as ApiControlKey]
      if (apiTarget) {
        void postDeviceAction(apiTarget.deviceId, apiTarget.capabilityId, value)
      }
    },
    []
  )

  const handleSelectDevice = useCallback((device: DeviceKey | null) => {
    setState((prev) => ({ ...prev, selectedDevice: device }))
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadInitialState = async () => {
      const nextState = await fetchInitialSceneState()
      if (!isCancelled && nextState) {
        setState((prev) => ({ ...prev, ...nextState }))
      }
    }

    void loadInitialState()

    const source = new EventSource("/api/simulator-events")

    const onConnected = (event: MessageEvent) => {
      try {
        console.log("SSE connected:", JSON.parse(event.data))
      } catch {
        console.log("SSE connected")
      }
    }

    const onDeviceStateChange = (event: MessageEvent) => {
      if (isCancelled) return

      try {
        const snapshot = JSON.parse(event.data) as DeviceStateSnapshot

        if (!snapshot?.deviceId || !snapshot?.values) {
          console.warn("Ignoring malformed simulator event:", snapshot)
          return
        }

        setState((prev) => ({
          ...prev,
          ...applySnapshotToSceneState({}, snapshot),
        }))
      } catch (err) {
        console.error("Failed to parse simulator event:", err, event.data)
      }
    }

    source.addEventListener("connected", onConnected)
    source.addEventListener("device-state-change", onDeviceStateChange)

    source.onerror = (err) => {
      console.error("SSE error", err)
    }

    return () => {
      isCancelled = true
      source.removeEventListener("connected", onConnected)
      source.removeEventListener("device-state-change", onDeviceStateChange)
      source.close()
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-[radial-gradient(circle_at_top_left,#3c4254,#171925_45%,#11131d)] lg:flex-row">
      <div className="relative min-h-[42vh] flex-1 overflow-hidden lg:min-h-0">
        <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-[18rem] rounded-xl border border-[#f0b25f]/18 bg-[#11131d]/55 p-3 shadow-xl shadow-black/20 backdrop-blur-sm">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#e6ad74]">3D Digital Twin</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#f2e8d8]">Modern smart room</h2>
        </div>
        <SmartHomeScene {...state} />
        <DeviceSelector
          selectedDevice={state.selectedDevice}
          onSelect={handleSelectDevice}
        />
      </div>

      <ControlPanel state={state} onChange={handleChange} />
    </div>
  )
}

async function fetchInitialSceneState(): Promise<Partial<SmartHomeSceneProps> | null> {
  try {
    const response = await fetchWithTimeout("/api/devices/state", 3000)
    if (!response.ok) return null

    const snapshots = (await response.json()) as DeviceStateSnapshot[]

    return snapshots.reduce<Partial<SmartHomeSceneProps>>((next, snapshot) => {
      if (!snapshot) return next
      return applySnapshotToSceneState(next, snapshot)
    }, {})
  } catch {
    return null
  }
}

function applySnapshotToSceneState(
  next: Partial<SmartHomeSceneProps>,
  snapshot: DeviceStateSnapshot,
): Partial<SmartHomeSceneProps> {
  const values = snapshot.values

  switch (snapshot.deviceId) {
    case "sim-table-lamp":
      next.tableLampOn = Boolean(values.power)
      next.tableLampBrightness = toUnit(values.brightness)
      if (typeof values.color === "string") next.tableLampColor = values.color
      break
    case "sim-corner-leds":
      next.cornerLedIntensity = Boolean(values.power) ? toUnit(values.intensity) : 0
      if (typeof values.color === "string") next.cornerLedColor = values.color
      if (typeof values.hue === "number") next.cornerLedColor = hueToHex(values.hue)
      break
    case "sim-accent-light":
      next.accentLightIntensity = Boolean(values.power) ? toUnit(values.intensity) : 0
      if (typeof values.color === "string") next.accentLightColor = values.color
      break
    case "sim-tv":
      next.tvOn = Boolean(values.power)
      break
    case "sim-thermostat":
      next.thermostatOn = Boolean(values.power)
      if (typeof values.temperature === "number") next.thermostatTemp = values.temperature
      if (values.mode === "cool" || values.mode === "heat" || values.mode === "off") {
        next.thermostatMode = values.mode
      }
      break
  }

  return next
}

function toUnit(value: DeviceStateSnapshot["values"][string]) {
  return Math.max(0, Math.min(1, Number(value ?? 0) / 100))
}

function hueToHex(hue: number) {
  const normalizedHue = ((Math.round(hue) % 360) + 360) % 360
  const chroma = 1
  const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1))
  const segment = Math.floor(normalizedHue / 60)
  const [r, g, b] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][segment] ?? [chroma, 0, 0]

  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`
}

function toHexChannel(value: number) {
  return Math.round(value * 255).toString(16).padStart(2, "0")
}

async function postDeviceAction<K extends keyof SmartHomeSceneProps>(
  deviceId: string,
  capabilityId: string,
  value: SmartHomeSceneProps[K],
) {
  const nextValue = typeof value === "number" && value <= 1 ? Math.round(value * 100) : value

  await fetch(`/api/devices/${encodeURIComponent(deviceId)}/actions/${encodeURIComponent(capabilityId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commandType: "set",
      value: nextValue,
    }),
  }).catch(() => undefined)
}

async function fetchWithTimeout(input: string, ms = 5000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)

  try {
    return await fetch(input, {
      cache: "no-store",
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}
