"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  Cog,
  Fan,
  Hand,
  Lightbulb,
  ListChecks,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
  Server,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import {
  ActionMapping,
  BackendManagedDevice,
  defaultDevices,
  deviceKinds,
  DeviceCapability,
  DeviceDefinition,
  DeviceManagerInfo,
  DeviceKind,
  GloveMappingContract,
  mapBackendDeviceToDefinition,
  MappingMode,
  sourceInputs,
} from "@/lib/gestura-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type DeviceActionResult = {
  ok: boolean;
  deviceId: string;
  capabilityId: string;
  appliedValue?: string | number | boolean | null;
  message?: string;
};

export default function ConfigurationPage() {
  const [devices, setDevices] = useState<DeviceDefinition[]>(defaultDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [managers, setManagers] = useState<DeviceManagerInfo[]>([]);
  const [backendUrl, setBackendUrl] = useState("http://localhost:3001");
  const [kasaName, setKasaName] = useState("Kasa Lab");
  const [externalName, setExternalName] = useState("");
  const [externalBaseUrl, setExternalBaseUrl] = useState("");
  const [externalAuthToken, setExternalAuthToken] = useState("");
  const [managerStatus, setManagerStatus] = useState("No managers loaded.");
  const [scanningKasa, setScanningKasa] = useState(false);
  const [syncingExternalManagers, setSyncingExternalManagers] = useState<Set<string>>(new Set());
  const [removingExternalManagers, setRemovingExternalManagers] = useState<Set<string>>(new Set());
  const [testCapabilityId, setTestCapabilityId] = useState<string>("");
  const [testValue, setTestValue] = useState<string>("");
  const [testStatus, setTestStatus] = useState("Select a device function to test.");
  const [testingFunction, setTestingFunction] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;
  const testCapability = useMemo(
    () =>
      selectedDevice?.capabilities.find((capability) => capability.id === testCapabilityId) ??
      selectedDevice?.capabilities[0] ??
      null,
    [selectedDevice, testCapabilityId],
  );
  const kasaManager = useMemo(
    () => managers.find((manager) => manager.kind === "kasa" || manager.id.includes("kasa")) ?? null,
    [managers],
  );
  const externalManagers = useMemo(
    () => managers.filter((manager) => manager.integrationType === "external"),
    [managers],
  );
  const kasaIsScanning = scanningKasa || getManagerBooleanMetadata(kasaManager, "isScanning");
  const kasaLastScanned = formatLastScanned(kasaManager, clockTick, kasaIsScanning);
  const selectedDeviceMappings = useMemo(
    () =>
      selectedDevice?.capabilities.map(
        (capability) =>
          mappings.find(
            (mapping) =>
              mapping.targetDevice === selectedDevice.id && mapping.targetAction === capability.id,
          ) ?? createCapabilityMapping(selectedDevice.id, capability),
      ) ?? [],
    [selectedDevice, mappings],
  );

  const generatedConfig = useMemo(
    () => selectedDevice ? ({
      device: selectedDevice,
      mappings: selectedDeviceMappings.map(toGloveMappingContract),
    }) : null,
    [selectedDevice, selectedDeviceMappings],
  );

  const updateSelectedDevice = (updates: Partial<DeviceDefinition>) => {
    if (!selectedDevice) return;
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

  const updateCapabilityMapping = <Key extends keyof ActionMapping>(
    capability: DeviceCapability,
    key: Key,
    value: ActionMapping[Key],
  ) => {
    if (!selectedDevice) return;
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

  const refreshManagersAndDevices = async () => {
    try {
      const managerResponse = await fetch(`${backendUrl}/api/managers`);
      const managerList = managerResponse.ok
        ? ((await managerResponse.json()) as DeviceManagerInfo[])
        : [];
      setManagers(managerList);

      const deviceResponse = await fetch(`${backendUrl}/api/devices`);
      const backendDevices = deviceResponse.ok
        ? ((await deviceResponse.json()) as BackendManagedDevice[])
        : [];
      const mappedDevices = backendDevices.map((device) =>
        mapBackendDeviceToDefinition(
          device,
          managerList.find((manager) => manager.id === device.managerId),
        ),
      );
      setDevices(mappedDevices);
      setSelectedDeviceId((current) =>
        current && mappedDevices.some((device) => device.id === current)
          ? current
          : mappedDevices[0]?.id ?? null,
      );
      setManagerStatus(`Loaded ${managerList.length} managers and ${mappedDevices.length} devices.`);
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to load managers.");
    }
  };

  const enableKasaManager = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/managers/kasa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: kasaName }),
      });

      if (!response.ok) throw new Error(`Kasa manager registration failed (${response.status})`);
      setManagerStatus("Kasa native manager enabled.");
      await refreshManagersAndDevices();
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to enable Kasa manager.");
    }
  };

  const disableKasaManager = async () => {
    if (!kasaManager) return;

    try {
      const response = await fetch(`${backendUrl}/api/managers/${kasaManager.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(`Kasa manager disable failed (${response.status})`);
      setManagerStatus("Kasa native manager disabled.");
      await refreshManagersAndDevices();
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to disable Kasa manager.");
    }
  };

  const scanKasaManager = async () => {
    if (!kasaManager) return;

    setScanningKasa(true);
    setManagerStatus("Scanning Kasa devices now.");
    try {
      const response = await fetch(`${backendUrl}/api/managers/${kasaManager.id}/discover`, {
        method: "POST",
      });

      if (!response.ok) throw new Error(`Kasa scan failed (${response.status})`);
      setManagerStatus("Kasa scan complete.");
      await refreshManagersAndDevices();
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to scan Kasa devices.");
    } finally {
      setScanningKasa(false);
    }
  };

  const addExternalManager = async () => {
    try {
      const normalizedBaseUrl = normalizeExternalBaseUrl(externalBaseUrl);
      const response = await fetch(`${backendUrl}/api/managers/external`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: externalName,
          baseUrl: normalizedBaseUrl,
          authToken: externalAuthToken || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.errors?.join(", ") || `External manager validation failed (${response.status})`);
      }

      setManagerStatus(`External manager added. Imported ${payload.deviceCount ?? 0} devices.`);
      setExternalName("");
      setExternalBaseUrl("");
      setExternalAuthToken("");
      await refreshManagersAndDevices();
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to add external manager.");
    }
  };

  const reloadExternalManager = async (manager: DeviceManagerInfo) => {
    const managerId = manager.id;
    setSyncingExternalManagers((current) => new Set(current).add(managerId));
    setManagerStatus(`${manager.kind === "simulator" ? "Scanning" : "Reloading"} ${managerId}.`);

    try {
      const endpoint = manager.kind === "simulator" ? "discover" : "sync";
      const response = await fetch(`${backendUrl}/api/managers/${encodeURIComponent(managerId)}/${endpoint}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error(`External manager refresh failed (${response.status})`);
      setManagerStatus(`External manager ${managerId} refreshed.`);
      await refreshManagersAndDevices();
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to reload external manager.");
    } finally {
      setSyncingExternalManagers((current) => {
        const next = new Set(current);
        next.delete(managerId);
        return next;
      });
    }
  };

  const removeExternalManager = async (managerId: string) => {
    setRemovingExternalManagers((current) => new Set(current).add(managerId));
    setManagerStatus(`Removing ${managerId}.`);

    try {
      const response = await fetch(`${backendUrl}/api/managers/${encodeURIComponent(managerId)}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(`External manager remove failed (${response.status})`);
      setManagerStatus(`External manager ${managerId} removed.`);
      await refreshManagersAndDevices();
    } catch (error) {
      setManagerStatus(error instanceof Error ? error.message : "Failed to remove external manager.");
    } finally {
      setRemovingExternalManagers((current) => {
        const next = new Set(current);
        next.delete(managerId);
        return next;
      });
    }
  };

  const runTestFunction = async () => {
    if (!selectedDevice || !testCapability) return;

    setTestingFunction(true);
    setTestStatus(`Running ${selectedDevice.name}.${testCapability.id}.`);

    try {
      const response = await fetch(
        `${backendUrl}/api/devices/${encodeURIComponent(selectedDevice.id)}/actions/${encodeURIComponent(testCapability.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commandType: "set",
            value: coerceTestValue(testCapability, testValue),
          }),
        },
      );
      const result = (await response.json()) as DeviceActionResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || `Action failed (${response.status})`);
      }

      setTestStatus(
        `Applied ${testCapability.id}: ${formatTestValue(result.appliedValue)}`,
      );
    } catch (error) {
      setTestStatus(error instanceof Error ? error.message : "Test function failed.");
    } finally {
      setTestingFunction(false);
    }
  };

  useEffect(() => {
    void refreshManagersAndDevices();
  }, []);

  useEffect(() => {
    const nextCapability = selectedDevice?.capabilities[0] ?? null;
    setTestCapabilityId(nextCapability?.id ?? "");
    setTestValue(nextCapability ? defaultTestValue(nextCapability) : "");
    setTestStatus(
      nextCapability ? "Ready to test an allowed device function." : "Select a device function to test.",
    );
  }, [selectedDevice?.id]);

  useEffect(() => {
    if (testCapability) {
      setTestValue(defaultTestValue(testCapability));
    }
  }, [testCapability?.id]);

  useEffect(() => {
    const interval = setInterval(() => void refreshManagersAndDevices(), 60_000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  useEffect(() => {
    const interval = setInterval(() => setClockTick(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

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

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Server className="size-5 text-primary" />
              <div>
                <h2 className="font-semibold">Native Managers</h2>
                <p className="text-sm text-muted-foreground">Backend-hosted integrations.</p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                    <Lightbulb className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">Kasa</h3>
                      <Badge
                        variant={kasaManager ? "default" : "outline"}
                        className={
                          kasaManager
                            ? "rounded-full bg-emerald-600 text-white"
                            : "rounded-full border-muted-foreground/30 text-muted-foreground"
                        }
                      >
                        {kasaManager ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Native TP-Link Kasa manager for bulbs and plugs.
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {kasaManager && (
                    <Button
                      onClick={scanKasaManager}
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={kasaIsScanning}
                    >
                      <RefreshCw className={`size-4 ${kasaIsScanning ? "animate-spin" : ""}`} />
                      Scan now
                    </Button>
                  )}
                  <Button
                    onClick={kasaManager ? disableKasaManager : enableKasaManager}
                    variant={kasaManager ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {kasaManager ? (
                      "Disable"
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Manager name">
                  <Input
                    value={kasaManager?.name ?? kasaName}
                    onChange={(event) => setKasaName(event.target.value)}
                    disabled={Boolean(kasaManager)}
                  />
                </Field>
                <Field label="Manager ID">
                  <Input
                    value={kasaManager?.id ?? "kasa-main"}
                    disabled
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Last scanned">
                  <Input value={kasaLastScanned} disabled />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Server className="size-5 text-chart-2" />
              <div>
                <h2 className="font-semibold">External Managers</h2>
                <p className="text-sm text-muted-foreground">Backend validates the manager API contract.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <Input
                  value={externalName}
                  onChange={(event) => setExternalName(event.target.value)}
                  placeholder="Lab simulator"
                />
              </Field>
              <Field label="Base URL">
                <Input
                  value={externalBaseUrl}
                  onChange={(event) => setExternalBaseUrl(event.target.value)}
                  className="font-mono text-xs"
                  placeholder="http://192.168.1.42:3101"
                />
              </Field>
              <Field label="Auth token">
                <Input
                  value={externalAuthToken}
                  onChange={(event) => setExternalAuthToken(event.target.value)}
                  placeholder="optional"
                />
              </Field>
              <div className="flex items-end gap-2">
                <Button onClick={addExternalManager} className="flex-1">
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {externalManagers.length === 0 && (
                <div className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No external managers registered.
                </div>
              )}
              {externalManagers.map((manager) => {
                const isSyncing = syncingExternalManagers.has(manager.id);
                const isRemoving = removingExternalManagers.has(manager.id);
                const refreshLabel = manager.kind === "simulator" ? "Scan now" : "Reload";

                return (
                  <div
                    key={manager.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{manager.name}</h3>
                          <Badge className="rounded-full bg-chart-2 text-white">
                            {manager.kind}
                          </Badge>
                          <Badge variant={manager.online ? "default" : "outline"}>
                            {manager.online ? "Online" : "Offline"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                          {manager.id}
                          {manager.baseUrl ? ` · ${manager.baseUrl}` : ""}
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button
                          onClick={() => void reloadExternalManager(manager)}
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={isSyncing || isRemoving}
                        >
                          <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
                          {refreshLabel}
                        </Button>
                        <Button
                          onClick={() => void removeExternalManager(manager.id)}
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={isRemoving || isSyncing}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              {managerStatus}
            </div>
          </div>
        </section>

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
              {devices.length === 0 && (
                <div className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No devices imported yet. Enable a native manager or add an external manager.
                </div>
              )}
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
                    className={`absolute left-2 top-0 rounded-b px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background ${managerColorClass(device.managerId)}`}
                  >
                    {device.managerId}
                  </span>
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

          {selectedDevice ? (
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
                <Field label="Supported actions">
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
                {selectedDevice.capabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{capability.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {capability.type}
                        {capability.min !== undefined && capability.max !== undefined
                          ? ` ${capability.min}..${capability.max}`
                          : ""}
                      </div>
                    </div>
                    <Badge variant="default">Supported</Badge>
                  </div>
                ))}
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

                <TestFunctionPanel
                  device={selectedDevice}
                  capability={testCapability}
                  capabilityId={testCapabilityId}
                  value={testValue}
                  status={testStatus}
                  isRunning={testingFunction}
                  onCapabilityChange={setTestCapabilityId}
                  onValueChange={setTestValue}
                  onRun={() => void runTestFunction()}
                />
              </div>
            </div>
          </section>
          ) : (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold">Device Definition</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select an imported device to configure its enabled actions and function mappings.
              </p>
            </section>
          )}
        </section>

        {selectedDevice && (
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
        )}
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
  const modeOptions = mappingModesForCapability(capability);
  const selectedMode = modeOptions.includes(mapping.mode) ? mapping.mode : modeOptions[0];

  return (
    <details className="group rounded-md border border-border bg-background p-4">
      <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{capability.label}</h3>
            <Badge variant="outline">{capability.type}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Target fixed to {deviceId}.{capability.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{mapping.mode}</Badge>
          <span className="text-xs text-muted-foreground group-open:hidden">Expand</span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">Collapse</span>
        </div>
      </summary>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            value={selectedMode}
            onValueChange={(value) => onUpdate("mode", value as MappingMode)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modeOptions.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
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
    </details>
  );
}

function TestFunctionPanel({
  device,
  capability,
  capabilityId,
  value,
  status,
  isRunning,
  onCapabilityChange,
  onValueChange,
  onRun,
}: {
  device: DeviceDefinition;
  capability: DeviceCapability | null;
  capabilityId: string;
  value: string;
  status: string;
  isRunning: boolean;
  onCapabilityChange: (capabilityId: string) => void;
  onValueChange: (value: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="mt-5 rounded-md border border-border bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Play className="size-4 text-primary" />
        <div>
          <h3 className="font-semibold">Test Function</h3>
          <p className="text-xs text-muted-foreground">
            Executes through the backend action router for {device.name}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <Field label="Function">
          <Select
            value={capabilityId}
            onValueChange={onCapabilityChange}
            disabled={device.capabilities.length === 0 || isRunning}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select function" />
            </SelectTrigger>
            <SelectContent>
              {device.capabilities.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <TestValueField
          capability={capability}
          value={value}
          disabled={!capability || isRunning}
          onChange={onValueChange}
        />

        <div className="flex items-end">
          <Button
            onClick={onRun}
            disabled={!capability || isRunning}
            className="w-full md:w-auto"
          >
            <Play className="size-4" />
            {isRunning ? "Running" : "Run"}
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-card p-3 font-mono text-xs text-muted-foreground">
        {status}
      </div>
    </div>
  );
}

function TestValueField({
  capability,
  value,
  disabled,
  onChange,
}: {
  capability: DeviceCapability | null;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (capability?.type === "toggle") {
    return (
      <Field label="Value">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">On</SelectItem>
            <SelectItem value="false">Off</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (capability?.type === "discrete" && capability.options?.length) {
    return (
      <Field label="Value">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {capability.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (capability?.type === "color") {
    return (
      <Field label="Value">
        <Input
          type="color"
          value={value || "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-10"
        />
      </Field>
    );
  }

  return (
    <Field label="Value">
      <Input
        type={capability?.type === "range" ? "number" : "text"}
        value={value}
        min={capability?.min}
        max={capability?.max}
        step={capability?.step}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function createCapabilityMapping(deviceId: string, capability: DeviceCapability): ActionMapping {
  const [mode] = mappingModesForCapability(capability);

  return {
    source: capability.type === "toggle" ? "bottom_tap" : "glove.roll",
    mode,
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

function mappingModesForCapability(capability: DeviceCapability): MappingMode[] {
  if (capability.type === "toggle") return ["toggle"];
  if (capability.type === "discrete") return ["scene"];
  if (capability.type === "range") return ["continuous_absolute", "continuous_delta", "step"];
  return ["continuous_absolute"];
}

function defaultTestValue(capability: DeviceCapability) {
  if (capability.type === "toggle") return "true";
  if (capability.type === "color") return "#ffffff";
  if (capability.type === "discrete") return capability.options?.[0] ?? "";

  const min = capability.min ?? 0;
  const max = capability.max ?? 100;
  return String(Math.round((min + max) / 2));
}

function coerceTestValue(capability: DeviceCapability, value: string) {
  if (capability.type === "toggle") return value === "true";
  if (capability.type === "range") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return capability.min ?? 0;
    return Math.max(capability.min ?? numeric, Math.min(capability.max ?? numeric, numeric));
  }
  return value;
}

function formatTestValue(value: DeviceActionResult["appliedValue"]) {
  if (value === null || value === undefined) return "null";
  return String(value);
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

function getManagerBooleanMetadata(
  manager: DeviceManagerInfo | null,
  key: string,
): boolean {
  return manager?.metadata?.[key] === true;
}

function getManagerStringMetadata(
  manager: DeviceManagerInfo | null,
  key: string,
): string | null {
  const value = manager?.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function formatLastScanned(
  manager: DeviceManagerInfo | null,
  nowMs: number,
  isScanning: boolean,
) {
  if (!manager) return "Disabled";
  if (isScanning) return "Scanning now";

  const lastDiscoveryAt = getManagerStringMetadata(manager, "lastDiscoveryAt");
  if (!lastDiscoveryAt) return "Not scanned yet";

  const scannedAtMs = new Date(lastDiscoveryAt).getTime();
  if (!Number.isFinite(scannedAtMs)) return "Unknown";

  const elapsedMs = Math.max(0, nowMs - scannedAtMs);
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes === 1) return "1 min ago";
  return `${elapsedMinutes} mins ago`;
}

function normalizeExternalBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}
