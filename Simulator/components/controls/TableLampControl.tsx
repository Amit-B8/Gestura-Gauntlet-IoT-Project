import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import type { SmartHomeSceneProps } from "../smart-home/types"

type Props = {
  tableLampOn: SmartHomeSceneProps["tableLampOn"]
  tableLampBrightness: SmartHomeSceneProps["tableLampBrightness"]
  tableLampColor: SmartHomeSceneProps["tableLampColor"]
  onChange: <K extends keyof SmartHomeSceneProps>(key: K, value: SmartHomeSceneProps[K]) => void
}

export function TableLampControl({ tableLampOn, tableLampBrightness, tableLampColor, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Table Lamp
          <Switch
            checked={tableLampOn}
            onCheckedChange={(v) => onChange("tableLampOn", v)}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <input
            type="color"
            value={tableLampColor}
            onChange={(e) => onChange("tableLampColor", e.target.value)}
            className="w-full h-8 rounded border border-input cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Brightness</Label>
          <Slider
            value={[tableLampBrightness * 100]}
            onValueChange={([v]) => onChange("tableLampBrightness", v / 100)}
            max={100}
            step={1}
            disabled={!tableLampOn}
          />
        </div>
      </CardContent>
    </Card>
  )
}
