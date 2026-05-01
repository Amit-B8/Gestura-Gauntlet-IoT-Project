import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { SmartHomeSceneProps } from "../smart-home/types"

type Props = {
  tvOn: SmartHomeSceneProps["tvOn"]
  onChange: <K extends keyof SmartHomeSceneProps>(key: K, value: SmartHomeSceneProps[K]) => void
}

export function TVControl({ tvOn, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          TV
          <Switch
            checked={tvOn}
            onCheckedChange={(v) => onChange("tvOn", v)}
          />
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
