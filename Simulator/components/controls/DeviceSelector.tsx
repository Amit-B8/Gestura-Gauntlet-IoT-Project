import { Button } from "@/components/ui/button"
import type { SmartHomeSceneProps } from "../smart-home/types"

type DeviceKey = NonNullable<SmartHomeSceneProps["selectedDevice"]>

const DEVICE_LABELS: Record<DeviceKey, string> = {
  tableLamp: "Table Lamp",
  cornerLeds: "Corner LEDs",
  accentLight: "Accent Light",
  tv: "TV",
  thermostat: "Thermostat",
}

type Props = {
  selectedDevice: SmartHomeSceneProps["selectedDevice"]
  onSelect: (device: DeviceKey | null) => void
}

export function DeviceSelector({ selectedDevice, onSelect }: Props) {
  return (
    <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2 justify-center rounded-2xl border border-[#c97855]/20 bg-[#171925]/75 p-3 shadow-2xl shadow-black/30 backdrop-blur-md">
      {(Object.keys(DEVICE_LABELS) as DeviceKey[]).map((device) => (
        <Button
          key={device}
          variant={selectedDevice === device ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelect(selectedDevice === device ? null : device)}
          className="text-xs shadow-sm"
        >
          {DEVICE_LABELS[device]}
        </Button>
      ))}
    </div>
  )
}
