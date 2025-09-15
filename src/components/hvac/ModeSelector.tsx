import { Label } from "@/components/ui/label"
import { HVACCard } from "@/components/ui/hvac-card"
import { cn } from "@/lib/utils"

interface ModeSelectorProps {
  value: string
  onChange: (value: string) => void
}

const modes = [
  { value: "residencial", label: "Residencial", description: "até 140%" },
  { value: "corporativo", label: "Corporativo", description: "até 110%" },
  { value: "maximo", label: "Capacidade Máxima"},
]

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <HVACCard title="Modo de Simultaneidade" variant="warm">
      <div className="space-y-3">
        {modes.map((mode) => (
          <label
            key={mode.value}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
              "hover:bg-primary-warm/5 hover:border-primary-warm/30",
              value === mode.value
                ? "bg-primary-warm/10 border-primary-warm/50 text-primary-warm"
                : "bg-background/30 border-border/50 text-foreground"
            )}
          >
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                name="mode"
                value={mode.value}
                checked={value === mode.value}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                value === mode.value
                  ? "border-primary-warm bg-primary-warm"
                  : "border-border"
              )}>
                {value === mode.value && (
                  <div className="w-2 h-2 rounded-full bg-background" />
                )}
              </div>
              <div>
                <div className="font-medium">{mode.label}</div>
                <div className="text-xs text-muted-foreground">{mode.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </HVACCard>
  )
}