// HVAC Calculator Logic - Ported from original HTML
import { supabase } from "@/integrations/supabase/client"

export interface EvaporatorModel {
  nome: string
  modelo: string
  capNominal: number
  capMax: number
  combinacoes: Set<string>
}

// Utility functions
const norm = (arr: number[]): string => [...arr].sort((a, b) => a - b).join(',')
const soma = (arr: number[]): number => arr.reduce((t, n) => t + n, 0)

export function capEfetiva(modelo: EvaporatorModel, modo: string): number {
  const { capNominal, capMax } = modelo
  if (modo === 'residencial') return Math.min(capNominal * 1.4, capMax)
  if (modo === 'corporativo') return Math.min(capNominal * 1.1, capMax)
  return capMax
}

export function porcento(v: number): string {
  return (Math.round(v * 10) / 10).toString().replace('.', ',')
}

export function parseEntrada(txt: string): number[] {
  if (!txt || !txt.trim()) return []
  return txt.split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => [7, 9, 12, 18, 24].includes(x))
    .slice(0, 5)
}

function criarModeloDaikin(nome: string, capNominal: number, capMax: number, lista: number[][]): EvaporatorModel {
  return {
    nome,
    modelo: nome.split(' ')[1],
    capNominal,
    capMax,
    combinacoes: new Set(lista.map(v => norm(v)))
  }
}

// Conversão genérica de registros do DB para EvaporatorModel
export function criarModeloFromDB(dado: any): EvaporatorModel {
  const nome: string = dado.nome
  const modelo: string = dado.modelo || (typeof nome === 'string' ? nome.split(' ')[1] : '')
  const capNominal: number = dado.cap_nominal
  const capMax: number = dado.cap_max
  const combinacoesArr: string[] = Array.isArray(dado.combinacoes) ? dado.combinacoes : []
  const combinacoes = new Set(
    combinacoesArr
      .map((c) => c.split(',').map((s) => parseInt(s.trim(), 10)))
      .map((nums) => norm(nums))
  )
  return { nome, modelo, capNominal, capMax, combinacoes }
}

// Daikin Models (fallback estático)
const DAIKIN_18_BI = criarModeloDaikin('Daikin 18 Bi', 18, 24, [
  [9, 9],
  [9, 12],
  [12, 12]
])

const DAIKIN_18_TRI = criarModeloDaikin('Daikin 18 Tri', 18, 30, [
  [9, 9],
  [9, 12],
  [9, 18],
  [12, 12],
  [12, 18],
  [9, 9, 9],
  [9, 9, 12]
])

const DAIKIN_24 = criarModeloDaikin('Daikin 24', 24, 38, [
  [9, 9], [9, 12], [9, 18],
  [12, 12], [12, 18], [9, 9, 9], [9, 9, 12],
  [9, 20], [12, 20], [18, 18], [18, 20],
  [9, 9, 18], [9, 9, 20], [9, 12, 12], [9, 12, 18], [12, 12, 12]
])

const DAIKIN_28 = criarModeloDaikin('Daikin 28', 28, 45, [
  [9, 9], [9, 12], [9, 18],
  [12, 12], [12, 18], [9, 9, 9], [9, 9, 12],
  [9, 20], [12, 20], [18, 18], [18, 20],
  [9, 9, 18], [9, 9, 20], [9, 12, 12], [9, 12, 18], [12, 12, 12],
  [9, 24], [12, 24], [18, 24], [20, 20], [20, 24],
  [9, 9, 24], [9, 12, 20], [9, 12, 24], [9, 18, 18], [9, 18, 20], [9, 20, 20],
  [12, 12, 18], [12, 12, 20], [12, 12, 24], [12, 18, 18], [12, 18, 20],
  [9, 9, 9, 9], [9, 9, 9, 12], [9, 9, 9, 18], [9, 9, 9, 20],
  [9, 9, 12, 12], [9, 9, 12, 18], [9, 9, 12, 20],
  [9, 12, 12, 12], [9, 12, 12, 18], [12, 12, 12, 12]
])

const DAIKIN_34 = criarModeloDaikin('Daikin 34', 34, 54, [
  [9, 9], [9, 12], [9, 18],
  [12, 12], [12, 18], [9, 9, 9], [9, 9, 12],
  [9, 20], [12, 20], [18, 18], [18, 20],
  [9, 9, 18], [9, 9, 20], [9, 12, 12], [9, 12, 18], [12, 12, 12],
  [9, 24], [12, 24], [18, 24], [20, 20], [20, 24],
  [9, 9, 24], [9, 12, 20], [9, 12, 24], [9, 18, 18], [9, 18, 20], [9, 20, 20],
  [12, 12, 18], [12, 12, 20], [12, 12, 24], [12, 18, 18], [12, 18, 20],
  [9, 9, 9, 9], [9, 9, 9, 12], [9, 9, 9, 18], [9, 9, 9, 20],
  [9, 9, 12, 12], [9, 9, 12, 18], [9, 9, 12, 20],
  [9, 12, 12, 12], [9, 12, 12, 18], [12, 12, 12, 12],
  [9, 18, 24], [9, 20, 24], [12, 18, 24], [12, 20, 20], [18, 18, 18],
  [9, 9, 9, 24], [9, 9, 12, 24], [9, 9, 18, 18], [9, 12, 12, 20], [12, 12, 12, 18]
])

const DAIKIN_38 = criarModeloDaikin('Daikin 38', 38, 60, [
  [9, 9], [9, 12], [9, 18],
  [12, 12], [12, 18], [9, 9, 9], [9, 9, 12],
  [9, 20], [12, 20], [18, 18], [18, 20],
  [9, 9, 18], [9, 9, 20], [9, 12, 12], [9, 12, 18], [12, 12, 12],
  [9, 24], [12, 24], [18, 24], [20, 20], [20, 24],
  [9, 9, 24], [9, 12, 20], [9, 12, 24], [9, 18, 18], [9, 18, 20], [9, 20, 20],
  [12, 12, 18], [12, 12, 20], [12, 12, 24], [12, 18, 18], [12, 18, 20],
  [9, 9, 9, 9], [9, 9, 9, 12], [9, 9, 9, 18], [9, 9, 9, 20],
  [9, 9, 12, 12], [9, 9, 12, 18], [9, 9, 12, 20],
  [9, 12, 12, 12], [9, 12, 12, 18], [12, 12, 12, 12],
  [9, 18, 24], [9, 20, 24], [12, 18, 24], [12, 20, 20], [18, 18, 18],
  [9, 9, 9, 24], [9, 9, 12, 24], [9, 9, 18, 18], [9, 12, 12, 20], [12, 12, 12, 18],
  [24, 24],
  [9, 9, 9, 9, 9], [9, 9, 9, 9, 12], [9, 9, 9, 9, 18], [9, 9, 9, 12, 12], [9, 9, 12, 12, 12]
])

const DAIKIN_MODELOS = [
  DAIKIN_18_BI, DAIKIN_18_TRI, DAIKIN_24, DAIKIN_28, DAIKIN_34, DAIKIN_38
]

// LG Models (fallback estático)
const LG_MODELOS_INFO = [
  { nome: 'LG 18', capNominal: 18, capMax: 24, maxEvaps: 2 },
  { nome: 'LG 21', capNominal: 21, capMax: 30, maxEvaps: 3 },
  { nome: 'LG 24', capNominal: 24, capMax: 36, maxEvaps: 3 },
  { nome: 'LG 30', capNominal: 30, capMax: 51, maxEvaps: 4 },
  { nome: 'LG 36', capNominal: 36, capMax: 54, maxEvaps: 5 },
  { nome: 'LG 48', capNominal: 48, capMax: 72, maxEvaps: 5 },
]
const LG_EVAPS = [7, 9, 12, 18, 24]

function gerarCombinacoesLG(capMax: number, maxEvaps: number): Set<string> {
  let res = new Set<string>()
  function comb(atual: number[]) {
    const somaAtual = soma(atual)
    if (atual.length > 0 && somaAtual <= capMax && atual.length <= maxEvaps) {
      res.add(norm(atual))
    }
    if (atual.length >= maxEvaps) return
    for (let cap of LG_EVAPS) {
      if (somaAtual + cap <= capMax) {
        comb([...atual, cap].sort((a, b) => a - b))
      }
    }
  }
  comb([])
  return res
}

const LG_MODELOS: EvaporatorModel[] = LG_MODELOS_INFO.map(info => ({
  nome: info.nome,
  modelo: info.nome.split(' ')[1],
  capNominal: info.capNominal,
  capMax: info.capMax,
  combinacoes: gerarCombinacoesLG(info.capMax, info.maxEvaps)
}))

// Samsung Models (fallback estático)
const SAMSUNG_18: EvaporatorModel = {
  nome: 'Samsung 18',
  modelo: '18',
  capNominal: 18,
  capMax: 30,
  combinacoes: new Set([
    norm([7,7]), norm([7,9]), norm([7,12]), norm([7,18]),
    norm([9,9]), norm([9,12]), norm([9,18]),
    norm([12,12]), norm([12,18]),
  ])
}

const SAMSUNG_24: EvaporatorModel = {
  nome: 'Samsung 24',
  modelo: '24',
  capNominal: 24,
  capMax: 39,
  combinacoes: new Set([
    norm([7,7]), norm([7,9]), norm([7,12]), norm([7,18]),
    norm([9,9]), norm([9,12]), norm([9,18]),
    norm([12,12]), norm([12,18]), norm([18,18]),
    norm([7,7,7]), norm([7,7,9]), norm([7,7,12]), norm([7,7,18]),
    norm([7,9,9]), norm([7,9,12]), norm([7,9,18]),
    norm([7,12,12]), norm([7,12,18]),
    norm([9,9,9]), norm([9,9,12]), norm([9,9,18]),
    norm([9,12,12]), norm([9,12,18]),
    norm([12,12,12]),
  ])
}

const SAMSUNG_28: EvaporatorModel = {
  nome: 'Samsung 28',
  modelo: '28',
  capNominal: 28,
  capMax: 48,
  combinacoes: new Set([
    norm([7,7]), norm([7,9]), norm([7,12]), norm([7,18]), norm([7,24]),
    norm([9,9]), norm([9,12]), norm([9,18]), norm([9,24]),
    norm([12,12]), norm([12,18]), norm([12,24]),
    norm([18,18]), norm([18,24]),
    norm([7,7,7]), norm([7,7,9]), norm([7,7,12]), norm([7,7,18]), norm([7,7,24]),
    norm([7,9,9]), norm([7,9,12]), norm([7,9,18]), norm([7,9,24]),
    norm([7,12,12]), norm([7,12,18]), norm([7,18,18]),
    norm([9,9,9]), norm([9,9,12]), norm([9,9,18]), norm([9,9,24]),
    norm([9,12,12]), norm([9,12,18]),
    norm([12,12,12]), norm([12,12,18]),
    norm([7,7,7,7]), norm([7,7,7,9]), norm([7,7,7,12]), norm([7,7,7,18]),
    norm([7,7,9,9]), norm([7,7,9,12]), norm([7,7,9,18]), norm([7,7,12,12]),
    norm([7,9,9,9]), norm([7,9,9,12]), norm([7,9,9,18]), norm([7,9,12,12]),
    norm([9,9,9,9]), norm([9,9,9,12]), norm([9,9,12,12]),
    norm([12,12,12,12]), norm([9,9,12,18]),
  ])
}

// Samsung 34 and 48 combinations would be added here...
// For now, keeping the essential ones

// Lista de modelos (inicialmente fallback estático) — será substituída por dados do DB quando carregados
export let MODELOS: EvaporatorModel[] = [
  SAMSUNG_18, SAMSUNG_24, SAMSUNG_28,
  ...LG_MODELOS,
  ...DAIKIN_MODELOS
]

async function carregarMODELOSFromDBInternal(): Promise<void> {
  const { data, error } = await supabase
    .from('multi_produtos')
    .select('*')
    .eq('tipo', 'MULTI')

  if (error) {
    console.error('Erro ao carregar multi_produtos:', error)
    return
  }

  const lista = (data || []).map(criarModeloFromDB)
  MODELOS = lista
}

let modelosIniciados = false
let subscrito = false

export async function ensureMODELOSFromDB(): Promise<void> {
  if (!modelosIniciados) {
    await carregarMODELOSFromDBInternal()
    modelosIniciados = true
  }
  if (!subscrito) {
    try {
      supabase
        .channel('multi_produtos_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'multi_produtos' }, async () => {
          await carregarMODELOSFromDBInternal()
        })
        .subscribe()
      subscrito = true
    } catch (e) {
      console.warn('Realtime não disponível, mantendo MODELOS por requisição única.', e)
    }
  }
}

function isDaikin(modelo: EvaporatorModel): boolean {
  return modelo.nome.toLowerCase().startsWith('daikin')
}

function keyParaModelo(modelo: EvaporatorModel, entrada: number[]): string {
  const arr = isDaikin(modelo) ? entrada.map(v => v === 7 ? 9 : v) : entrada
  return norm(arr)
}

export interface CalculationResult {
  modelo: EvaporatorModel
  existeNaTabela: boolean
  limite: number
  cabeNoLimite: boolean
  ocupa: number
  simult: number
}

export interface DetailedResult {
  nome: string
  capNominal: number
  capEfetiva: number
  uso: number
  status: 'ok' | 'warn' | 'error'
}

export function calcular(entradaOriginal: number[], modo: string, marcaSelecionada: string) {
  const total = soma(entradaOriginal)

  let tag7 = ''
  if (entradaOriginal.includes(7)) {
    if (marcaSelecionada === 'daikin') tag7 = ' - 7 tratado como 9'
    else if (marcaSelecionada === 'todas') tag7 = ' - 7 tratado como 9 para Daikin'
  }

  const resultados: CalculationResult[] = MODELOS.map(m => {
    const keyModelo = keyParaModelo(m, entradaOriginal)
    const existeNaTabela = m.combinacoes.has(keyModelo)
    const limite = capEfetiva(m, modo)
    const ocupa = total / limite * 100
    const cabeNoLimite = total <= limite + 1e-9
    const simult = (total / m.capNominal) * 100
    return { modelo: m, existeNaTabela, limite, cabeNoLimite, ocupa, simult }
  })

  const compativeis = resultados.filter(r => r.existeNaTabela && r.cabeNoLimite)

  // Generate detailed results for display
  const detailedResults: DetailedResult[] = []

  if (marcaSelecionada === "todas") {
    const marcas = [...new Set(MODELOS.map(m => m.nome.split(' ')[0]))]
    marcas.forEach(marca => {
      const melhor = compativeis
        .filter(r => r.modelo.nome.toLowerCase().startsWith(marca.toLowerCase()))
        .sort((a, b) => a.modelo.capNominal - b.modelo.capNominal)[0]

      if (melhor) {
        detailedResults.push({
          nome: melhor.modelo.nome,
          capNominal: melhor.modelo.capNominal * 1000, // Convert to BTU/h
          capEfetiva: melhor.limite * 1000, // Convert to BTU/h
          uso: Math.round(melhor.simult * 10) / 10,
          status: melhor.cabeNoLimite ? 'ok' : 'warn'
        })
      }
    })
  } else {
    const melhor = compativeis
      .filter(r => r.modelo.nome.toLowerCase().startsWith(marcaSelecionada.toLowerCase()))
      .sort((a, b) => a.modelo.capNominal - b.modelo.capNominal)[0]

    if (melhor) {
      detailedResults.push({
        nome: melhor.modelo.nome,
        capNominal: melhor.modelo.capNominal * 1000, // Convert to BTU/h
        capEfetiva: melhor.limite * 1000, // Convert to BTU/h
        uso: Math.round(melhor.simult * 10) / 10,
        status: melhor.cabeNoLimite ? 'ok' : 'warn'
      })
    }
  }

  // Generate detailed analysis text
  const linhas = resultados
    .filter(r => {
      if (marcaSelecionada === "todas") return true
      return r.modelo.nome.toLowerCase().startsWith(marcaSelecionada.toLowerCase())
    })
    .map(r => {
      const mark = r.existeNaTabela ? '✔' : '✖'
      const classe = r.existeNaTabela ? (r.cabeNoLimite ? 'Compatível' : 'Ultrapassa limite') : 'Combinação não listada'
      return `${mark} ${r.modelo.nome} - nominal ${r.modelo.capNominal} - máx ${r.modelo.capMax} - limite (${modo}) = ${r.limite} - ${classe} - Simultaneidade: ${porcento(r.simult)}%`
    })
    .join('\\n')

  const detalhes = `Entrada normalizada: [${entradaOriginal.slice().sort((a, b) => a - b).join(', ')}]${tag7 ? `\\n${tag7.replace(/^ - /, '')}` : ''}\\nSoma das evaporadoras: ${total}\\n\\n${linhas}`

  return {
    results: detailedResults,
    details: detalhes
  }
}
