export type CapabilityType = "toggle" | "range" | "color" | "discrete";

export type DeviceKind = "kasa-bulb" | "kasa-plug" | "sim-light" | "sim-fan";

export interface DeviceCapability {
  id: string;
  label: string;
  type: CapabilityType;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface DeviceDefinition {
  id: string;
  managerId: string;
  source: "kasa" | "simulator" | "custom";
  integrationType: "native" | "external";
  name: string;
  kind: DeviceKind;
  capabilities: DeviceCapability[];
}

export type MappingMode =
  | "toggle"
  | "continuous_absolute"
  | "continuous_delta"
  | "step"
  | "scene";

export interface ActionMapping {
  source: string;
  mode: MappingMode;
  targetDevice: string;
  targetAction: string;
  min: number;
  max: number;
  deadzone: number;
  step: number;
  invert: boolean;
  offset: number;
  smoothing: number;
}

export interface GloveMappingContract {
  id: string;
  gloveId: string;
  enabled: boolean;
  inputSource: string;
  targetDeviceId: string;
  targetCapabilityId: string;
  mode: MappingMode;
  transform: {
    deadzone: number;
    invert: boolean;
    offset: number;
    min: number;
    max: number;
    step: number;
    smoothing: number;
  };
}

export const sourceInputs = [
  "top_double_tap",
  "bottom_double_tap",
  "top_hold_roll",
  "bottom_tap",
  "bottom_hold_roll",
  "glove.roll",
  "glove.pitch",
] as const;

export const deviceKinds: { id: DeviceKind; label: string }[] = [
  { id: "kasa-bulb", label: "Kasa bulb" },
  { id: "kasa-plug", label: "Kasa plug" },
  { id: "sim-light", label: "Simulator light" },
  { id: "sim-fan", label: "Simulator fan" },
];

export const capabilityLibrary: DeviceCapability[] = [
  { id: "power", label: "Power", type: "toggle", options: ["off", "on"] },
  { id: "brightness", label: "Brightness", type: "range", min: 0, max: 100, step: 5 },
  { id: "hue", label: "Hue", type: "range", min: 0, max: 360, step: 5 },
  { id: "saturation", label: "Saturation", type: "range", min: 0, max: 100, step: 5 },
  { id: "color_temp", label: "Color temperature", type: "range", min: 2500, max: 6500, step: 100 },
  { id: "speed", label: "Speed", type: "range", min: 0, max: 3, step: 1 },
  { id: "temperature", label: "Temperature", type: "range", min: 60, max: 85, step: 1 },
  { id: "scene", label: "Scene", type: "discrete", options: ["focus", "break", "alert"] },
];

export const defaultDevices: DeviceDefinition[] = [
  {
    id: "desk_lamp",
    managerId: "kasa-main",
    source: "kasa",
    integrationType: "native",
    name: "Desk Lamp",
    kind: "kasa-bulb",
    capabilities: [
      capabilityLibrary[0],
      capabilityLibrary[1],
      capabilityLibrary[2],
      capabilityLibrary[3],
      capabilityLibrary[4],
    ],
  },
  {
    id: "desk_plug",
    managerId: "kasa-main",
    source: "kasa",
    integrationType: "native",
    name: "Desk Plug",
    kind: "kasa-plug",
    capabilities: [capabilityLibrary[0]],
  },
  {
    id: "sim_fan",
    managerId: "sim-manager-1",
    source: "simulator",
    integrationType: "external",
    name: "Simulator Fan",
    kind: "sim-fan",
    capabilities: [capabilityLibrary[0], capabilityLibrary[5]],
  },
];

export const defaultMapping: ActionMapping = {
  source: "glove.roll",
  mode: "continuous_absolute",
  targetDevice: "desk_lamp",
  targetAction: "brightness",
  min: 0,
  max: 100,
  deadzone: 0.12,
  step: 5,
  invert: false,
  offset: 0,
  smoothing: 0.25,
};
