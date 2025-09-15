import { useEffect, useMemo, useState } from "react"
import { HVACCard } from "@/components/ui/hvac-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"

interface ModeSelectorProps {
  value: string
  onChange: (value: string) => void
}

interface SimultOption {
  nome: string
  valor: number
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const [options, setOptions] = useState<SimultOption[]>([])
  const [selected, setSelected] = useState<string>(value)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('simultaneidade')
        .select('nome, valor')
        .order('nome', { ascending: true })

      if (!active) return
      if (error) {
        console.error('Erro ao buscar simultaneidade:', error)
        setOptions([
          { nome: 'Corporativo', valor: 1.1 },
          { nome: 'Residencial', valor: 1.4 },
        ])
        return
      }

      const list = (data || [])
        .filter((r: any) => typeof r?.nome === 'string' && typeof r?.valor === 'number')
        .map((r: any) => ({ nome: r.nome as string, valor: r.valor as number }))
      setOptions(list)
    }
    load()
    return () => { active = false }
  }, [])

  const residDefault = useMemo(() => {
    const resid = options.find(o => o.nome.toLowerCase() === 'residencial')
    return resid ? resid.valor.toString() : (options[0]?.valor?.toString() ?? '')
  }, [options])

  useEffect(() => {
    if (!options.length) return

    let next = value
    const isNumeric = !Number.isNaN(parseFloat(value)) && value !== 'maximo'

    if (value === 'residencial') {
      next = residDefault
    } else if (value === 'corporativo') {
      const corp = options.find(o => o.nome.toLowerCase() === 'corporativo')
      next = corp ? corp.valor.toString() : (isNumeric ? value : residDefault)
    } else if (!isNumeric && value !== 'maximo') {
      next = residDefault
    }

    setSelected(next)

    if (next && next !== value) {
      onChange(next)
    }
  }, [value, options, residDefault, onChange])

  const handleChange = (val: string) => {
    setSelected(val)
    onChange(val)
  }

  return (
    <HVACCard title="Modo de Simultaneidade" variant="warm">
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o modo" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.nome} value={opt.valor.toString()}>
              {`${opt.nome} (${Math.round(opt.valor * 100)}%)`}
            </SelectItem>
          ))}
          <SelectItem value="maximo"><span className="sr-only">Capacidade Máxima</span></SelectItem>
        </SelectContent>
      </Select>
    </HVACCard>
  )
}
