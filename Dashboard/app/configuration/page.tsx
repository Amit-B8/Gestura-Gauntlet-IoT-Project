"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  Check,
  Cog,
  Fan,
  Hand,
  Lightbulb,
  ListChecks,
  Plug,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import {
  ActionMapping,
  capabilityLibrary,
  defaultDevices,
  defaultMapping,
  deviceKinds,
  DeviceCapability,
  DeviceDefinition,
  DeviceKind,
  GloveMappingContract,
  MappingMode,
  sourceInputs,
} from "@/lib/gestura-config";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ConfigurationPage() {
  const [devices, setDevices] = useState<DeviceDefinition[]>(defaultDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDevices[0].id);
  const [mappings, setMappings] = useState<ActionMapping[]>([
    defaultMapping,
    {
      ...defaultMapping,
      source: "bottom_tap",
      mode: "toggle",
      targetAction: "power",
      min: 0,
      max: 1,
      step: 1,
      deadzone: 0,
      smoothing: 0,
    },
  ]);

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? devices[0];
  const selectedDeviceMappings = useMemo(
    () =>
      selectedDevice.capabilities.map(
        (capability) =>
          mappings.find(
            (mapping) =>
              mapping.targetDevice === selectedDevice.id && mapping.targetAction === capability.id,
          ) ?? createCapabilityMapping(selectedDevice.id, capability),
      ),
    [selectedDevice, mappings],
  );

  const generatedConfig = useMemo(
    () => ({
      device: selectedDevice,
      mappings: selectedDeviceMappings.map(toGloveMappingContract),
    }),
    [selectedDevice, selectedDeviceMappings],
  );

  const updateSelectedDevice = (updates: Partial<DeviceDefinition>) => {
    setDevices((current) =>
      current.map((device) =>
        device.id === selectedDevice.id
          ? {
              ...device,
              ...updates,
            }
          : device,
      ),
    );
  };

  const toggleCapability = (capability: DeviceCapability, enabled: boolean) => {
    const nextCapabilities = enabled
      ? [...selectedDevice.capabilities, capability]
      : selectedDevice.capabilities.filter((item) => item.id !== capability.id);

    updateSelectedDevice({ capabilities: nextCapabilities });

    if (!enabled) {
      setMappings((current) =>
        current.filter(
          (mapping) =>
            !(mapping.targetDevice === selectedDevice.id && mapping.targetAction === capability.id),
        ),
      );
    }
  };

  const updateCapabilityMapping = <Key extends keyof ActionMapping>(
    capability: DeviceCapability,
    key: Key,
    value: ActionMapping[Key],
  ) => {
    setMappings((current) => {
      const next = current.filter(
        (mapping) =>
          !(mapping.targetDevice === selectedDevice.id && mapping.targetAction === capability.id),
      );
      const existing =
        current.find(
          (mapping) =>
            mapping.targetDevice === selectedDevice.id && mapping.targetAction === capability.id,
        ) ?? createCapabilityMapping(selectedDevice.id, capability);

      return [
        ...next,
        {
          ...existing,
          [key]: value,
        },
      ];
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-col gap-5 border-b border-border/60 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Hand className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Gestura Gauntlet
              </h1>
              <p className="text-sm text-muted-foreground">Configuration</p>
            </div>
          </div>

          <nav className="flex h-10 w-fit items-center gap-1 rounded-md border border-border bg-card p-1">
            <Link className="inline-flex h-8 items-center gap-2 rounded-sm px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground" href="/">
              <Activity className="size-4" />
              Analytics
            </Link>
            <Link className="inline-flex h-8 items-center gap-2 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground" href="/configuration">
              <Settings className="size-4" />
              Configuration
            </Link>
          </nav>
        </header>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Devices</h2>
                <p className="text-sm text-muted-foreground">Backend-owned targets</p>
              </div>
              <Badge variant="outline">{devices.length}</Badge>
            </div>

            <div className="space-y-2">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => setSelectedDeviceId(device.id)}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-md border p-3 pl-4 text-left transition ${
                    selectedDeviceId === device.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-1 ${managerColorClass(device.managerId)}`}
                  />
                  <DeviceIcon kind={device.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{device.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {device.id} · imported via {device.managerId}
                    </div>
                  </div>
                  {selectedDeviceId === device.id && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>
          </aside>

          <section>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-5 flex items-center gap-2">
                <Cog className="size-5 text-primary" />
                <h2 className="font-semibold">Device Definition</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Device ID">
                  <Input value={selectedDevice.id} disabled className="font-mono text-xs" />
                </Field>
                <Field label="Display name">
                  <Input
                    value={selectedDevice.name}
                    onChange={(event) => updateSelectedDevice({ name: event.target.value })}
                  />
                </Field>
                <Field label="Icon/type">
                  <Select
                    value={selectedDevice.kind}
                    onValueChange={(value) => updateSelectedDevice({ kind: value as DeviceKind })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceKinds.map((kind) => (
                        <SelectItem key={kind.id} value={kind.id}>
                          {kind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Enabled actions">
                  <div className="text-sm text-muted-foreground">
                    {selectedDevice.capabilities.length} supported
                  </div>
                </Field>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoPill label="Manager" value={selectedDevice.managerId} tone={selectedDevice.managerId} />
                <InfoPill label="Source" value={selectedDevice.source} />
                <InfoPill label="Integration" value={selectedDevice.integrationType} />
              </div>

              <div className="mt-6 grid gap-2">
                {capabilityLibrary.map((capability) => {
                  const enabled = selectedDevice.capabilities.some((item) => item.id === capability.id);
                  return (
                    <label
                      key={capability.id}
                      className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          checked={enabled}
                          onCheckedChange={(checked) => toggleCapability(capability, checked === true)}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{capability.label}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {capability.type}
                            {capability.min !== undefined && capability.max !== undefined
                              ? ` ${capability.min}..${capability.max}`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <Badge variant={enabled ? "default" : "outline"}>
                        {enabled ? "Enabled" : "Off"}
                      </Badge>
                    </label>
                  );
                })}
              </div>

              <div className="mt-8">
                <div className="mb-5 flex items-center gap-2">
                  <SlidersHorizontal className="size-5 text-primary" />
                  <div>
                    <h2 className="font-semibold">Function Mappings</h2>
                    <p className="text-sm text-muted-foreground">
                      Each enabled function owns its input mapping and scaling parameters.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {selectedDevice.capabilities.map((capability) => {
                    const capabilityMapping =
                      mappings.find(
                        (item) =>
                          item.targetDevice === selectedDevice.id &&
                          item.targetAction === capability.id,
                      ) ?? createCapabilityMapping(selectedDevice.id, capability);

                    return (
                      <FunctionMappingCard
                        key={capability.id}
                        capability={capability}
                        deviceId={selectedDevice.id}
                        mapping={capabilityMapping}
                        onUpdate={(key, value) => updateCapabilityMapping(capability, key, value)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <ListChecks className="size-5 text-primary" />
              <div>
                <h2 className="font-semibold">Function Mapping Summary</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedDevice.name} mappings only
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {selectedDeviceMappings.map((item) => {
                return (
                  <div
                    key={`${item.source}-${item.targetDevice}-${item.targetAction}`}
                    className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="font-medium">
                        {item.source} {"->"} {selectedDevice.name}.{item.targetAction}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.mode}, range {item.min}..{item.max}, step {item.step}, deadzone {item.deadzone}
                      </div>
                    </div>
                    <Badge variant={item.invert ? "default" : "outline"}>
                      {item.invert ? "inverted" : "normal"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Generated Contract</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selected-device shape the backend can persist and execute through device adapters.
            </p>
            <pre className="mt-5 max-h-[520px] overflow-auto rounded-md bg-secondary p-4 text-xs leading-relaxed text-secondary-foreground">
              {JSON.stringify(generatedConfig, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}

function FunctionMappingCard({
  capability,
  deviceId,
  mapping,
  onUpdate,
}: {
  capability: DeviceCapability;
  deviceId: string;
  mapping: ActionMapping;
  onUpdate: <Key extends keyof ActionMapping>(key: Key, value: ActionMapping[Key]) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{capability.label}</h3>
            <Badge variant="outline">{capability.type}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Target fixed to {deviceId}.{capability.id}
          </p>
        </div>
        <Badge>{mapping.mode}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={`${capability.id} source`}>
          <Select value={mapping.source} onValueChange={(value) => onUpdate("source", value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceInputs.map((input) => (
                <SelectItem key={input} value={input}>
                  {input}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={`${capability.id} mode`}>
          <Select
            value={mapping.mode}
            onValueChange={(value) => onUpdate("mode", value as MappingMode)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toggle">toggle</SelectItem>
              <SelectItem value="continuous_absolute">continuous_absolute</SelectItem>
              <SelectItem value="continuous_delta">continuous_delta</SelectItem>
              <SelectItem value="step">step</SelectItem>
              <SelectItem value="scene">scene</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <NumberField label={`${capability.id} left min`} value={mapping.min} onChange={(value) => onUpdate("min", value)} />
        <NumberField label={`${capability.id} right max`} value={mapping.max} onChange={(value) => onUpdate("max", value)} />
        <NumberField label={`${capability.id} deadzone`} value={mapping.deadzone} step={0.01} onChange={(value) => onUpdate("deadzone", value)} />
        <NumberField label={`${capability.id} step size`} value={mapping.step} onChange={(value) => onUpdate("step", value)} />
        <NumberField label={`${capability.id} offset`} value={mapping.offset} step={0.01} onChange={(value) => onUpdate("offset", value)} />
        <NumberField label={`${capability.id} smoothing`} value={mapping.smoothing} step={0.05} onChange={(value) => onUpdate("smoothing", value)} />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-card p-3">
        <div>
          <Label htmlFor={`${deviceId}-${capability.id}-invert`}>Invert input</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Flip normalized direction before scaling.
          </p>
        </div>
        <Switch
          id={`${deviceId}-${capability.id}-invert`}
          checked={mapping.invert}
          onCheckedChange={(checked) => onUpdate("invert", checked)}
        />
      </div>

      <pre className="mt-4 max-h-52 overflow-auto rounded-md bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
        {JSON.stringify(mapping, null, 2)}
      </pre>
    </div>
  );
}

function createCapabilityMapping(deviceId: string, capability: DeviceCapability): ActionMapping {
  return {
    source: capability.type === "toggle" ? "bottom_tap" : "glove.roll",
    mode: capability.type === "toggle" ? "toggle" : "continuous_absolute",
    targetDevice: deviceId,
    targetAction: capability.id,
    min: capability.min ?? 0,
    max: capability.max ?? (capability.type === "toggle" ? 1 : 100),
    deadzone: capability.type === "toggle" ? 0 : 0.12,
    step: capability.step ?? 1,
    invert: false,
    offset: 0,
    smoothing: capability.type === "toggle" ? 0 : 0.25,
  };
}

function toGloveMappingContract(mapping: ActionMapping): GloveMappingContract {
  return {
    id: `${mapping.targetDevice}.${mapping.targetAction}.${mapping.source}`,
    gloveId: "primary_glove",
    enabled: true,
    inputSource: mapping.source,
    targetDeviceId: mapping.targetDevice,
    targetCapabilityId: mapping.targetAction,
    mode: mapping.mode,
    transform: {
      deadzone: mapping.deadzone,
      invert: mapping.invert,
      offset: mapping.offset,
      min: mapping.min,
      max: mapping.max,
      step: mapping.step,
      smoothing: mapping.smoothing,
    },
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function DeviceIcon({ kind }: { kind: DeviceKind }) {
  const Icon =
    kind === "kasa-bulb" || kind === "sim-light" ? Lightbulb : kind === "sim-fan" ? Fan : Plug;

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
      <Icon className="size-4" />
    </div>
  );
}

function InfoPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        {tone && <span className={`size-2 rounded-full ${managerColorClass(tone)}`} />}
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      </div>
      <div className="truncate font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function managerColorClass(managerId: string) {
  if (managerId.includes("kasa")) return "bg-primary";
  if (managerId.includes("sim")) return "bg-chart-2";
  return "bg-chart-4";
}
