export type SmartHomeSceneProps = {
  tableLampOn: boolean
  tableLampBrightness: number
  tableLampColor: string
  cornerLedColor: string
  cornerLedIntensity: number
  accentLightColor: string
  accentLightIntensity: number
  tvOn: boolean
  thermostatOn: boolean
  thermostatTemp: number
  thermostatMode: "cool" | "heat" | "off"
  selectedDevice?:
    | "tableLamp"
    | "cornerLeds"
    | "accentLight"
    | "tv"
    | "thermostat"
    | null
}

export type DeviceProps = {
  isSelected: boolean
}
