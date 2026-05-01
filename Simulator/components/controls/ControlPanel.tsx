import { TableLampControl } from "./TableLampControl"
import { CornerLedControl } from "./CornerLedControl"
import { AccentLightControl } from "./AccentLightControl"
import { TVControl } from "./TVControl"
import { ThermostatControl } from "./ThermostatControl"
import type { SmartHomeSceneProps } from "../smart-home/types"

type Props = {
  state: SmartHomeSceneProps
  onChange: <K extends keyof SmartHomeSceneProps>(key: K, value: SmartHomeSceneProps[K]) => void
}

export function ControlPanel({ state, onChange }: Props) {
  return (
    <aside className="h-[48vh] w-full overflow-y-auto border-t border-[#c97855]/25 bg-[#202431]/95 p-4 shadow-2xl shadow-black/35 backdrop-blur lg:h-screen lg:w-[20rem] lg:border-l lg:border-t-0">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#c97855]/30 bg-gradient-to-br from-[#303645] to-[#222735] p-4">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#e6ad74]">Gestura Simulator</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#f2e8d8]">Engineer Room</h1>
          <p className="mt-2 text-xs leading-relaxed text-[#c8bfaf]">
            Live smart-room controls mapped to the 3D device model.
          </p>
        </div>

        <TableLampControl
          tableLampOn={state.tableLampOn}
          tableLampBrightness={state.tableLampBrightness}
          tableLampColor={state.tableLampColor}
          onChange={onChange}
        />

        <CornerLedControl
          cornerLedColor={state.cornerLedColor}
          cornerLedIntensity={state.cornerLedIntensity}
          onChange={onChange}
        />

        <AccentLightControl
          accentLightColor={state.accentLightColor}
          accentLightIntensity={state.accentLightIntensity}
          onChange={onChange}
        />

        <TVControl
          tvOn={state.tvOn}
          onChange={onChange}
        />

        <ThermostatControl
          thermostatOn={state.thermostatOn}
          thermostatTemp={state.thermostatTemp}
          thermostatMode={state.thermostatMode}
          onChange={onChange}
        />
      </div>
    </aside>
  )
}
