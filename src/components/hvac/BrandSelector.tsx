import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { HVACCard } from "@/components/ui/hvac-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"

interface BrandSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function BrandSelector({ value, onChange }: BrandSelectorProps) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([])
  const [selected, setSelected] = useState<string>(value)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('multi_produtos')
        .select('fabricante')

      if (!active) return
      if (error) {
        console.error('Erro ao buscar fabricantes:', error)
        setOptions([
          { label: 'Todas as marcas', value: 'todas' },
        ])
        return
      }

      const fabricantes = Array.from(new Set((data || [])
        .map((r: any) => (r.fabricante || '').toString().trim())
        .filter((f: string) => f.length > 0)
      ))

      fabricantes.sort((a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))

      const opts = [{ label: 'Todas as marcas', value: 'todas' }, ...fabricantes.map((f: string) => ({ label: f, value: f.toLowerCase() }))]
      setOptions(opts)
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    setSelected(value)
  }, [value])

  const handleChange = (val: string) => {
    setSelected(val)
    onChange(val)
  }

  return (
    <HVACCard title="Marca do Equipamento" variant="cool">
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Todas as marcas" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </HVACCard>
  )
}
