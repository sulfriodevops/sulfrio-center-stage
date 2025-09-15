import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EvaporatorInput } from "@/components/hvac/EvaporatorInput"
import { ModeSelector } from "@/components/hvac/ModeSelector"
import { BrandSelector } from "@/components/hvac/BrandSelector"
import { CalculationResult } from "@/components/hvac/CalculationResult"
import { DetailedAnalysis } from "@/components/hvac/DetailedAnalysis"
import { ArrowLeft, Calculator, Snowflake } from "lucide-react"
import { Link } from "react-router-dom"
import { parseEntrada, calcular, ensureMODELOSFromDB, type DetailedResult } from "@/utils/hvac-calculator"

export default function HVACCalculator() {
  const [evaporators, setEvaporators] = useState("")
  const [mode, setMode] = useState("residencial")
  const [brand, setBrand] = useState("todas")
  const [results, setResults] = useState<DetailedResult[]>([])
  const [details, setDetails] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    setLoading(true)
    
    try {
      await ensureMODELOSFromDB()

      const entradaOriginal = parseEntrada(evaporators)

      if (entradaOriginal.length === 0) {
        setResults([])
        setDetails("Informe ao menos uma evaporadora (7, 9, 12, 18, 24).")
        setLoading(false)
        return
      }

      const calculation = calcular(entradaOriginal, mode, brand)
      setResults(calculation.results)
      setDetails(calculation.details)
      setLoading(false)
    } catch (error) {
      console.error("Error calculating:", error)
      setResults([])
      setDetails("Erro no cálculo. Verifique os dados informados.")
      setLoading(false)
    }
  }

  const handleClear = () => {
    setEvaporators("")
    setMode("residencial")
    setBrand("todas")
    setResults([])
    setDetails(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-cool rounded-lg flex items-center justify-center">
                  <Snowflake className="w-4 h-4 text-background" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Calculadora Multi Split</h1>
                  <p className="text-sm text-muted-foreground">Sistema de Ar Condicionado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <EvaporatorInput value={evaporators} onChange={setEvaporators} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModeSelector value={mode} onChange={setMode} />
              <BrandSelector value={brand} onChange={setBrand} />
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={handleCalculate}
                className="bg-gradient-cool hover:shadow-glow-cool transition-all duration-300 flex items-center space-x-2"
                disabled={loading || !evaporators.trim()}
              >
                <Calculator className="w-4 h-4" />
                <span>Calcular</span>
              </Button>
              <Button 
                onClick={handleClear}
                variant="outline"
                className="border-border/50 hover:bg-muted/10"
              >
                Limpar
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <CalculationResult results={results} loading={loading} />
          </div>

          {/* Detailed Analysis */}
          <DetailedAnalysis details={details} />
        </div>
      </div>
    </div>
  )
}
