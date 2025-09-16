import { useState, useEffect } from 'react';
import { HVACCard } from '@/components/ui/hvac-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusChip } from '@/components/ui/status-chip';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calcularCondensadoraVRF } from '@/utils/vrf-calculator';
import { evaporadoras } from '@/utils/evaporadoras';

// Mapa correto das evaporadoras (conforme versão antiga)
const getEvaporadorasMap = (brand: "samsung" | "daikin") => {
  const cat = evaporadoras[brand];
  const findTipo = (t: string) => cat.find(e => e.tipo === t)?.modelos || [];
  const toMap = (arr: ReadonlyArray<{ nominal: number; real: number }>) =>
    Object.fromEntries(arr.map(m => [m.nominal, m.real]));

  return {
    "hi-wall": toMap(findTipo("Hi Wall")),
    "cassete-1-via": toMap(findTipo("Cassete 1 Via")),
    "cassete-4-vias": toMap(findTipo("Cassete 4 Vias")),
    "duto": toMap(findTipo("Duto")),
    "piso-teto": toMap(findTipo("Piso Teto")),
  } as Record<string, Record<number, number>>;
};

export function VRFCondensadoraCalculator() {
  const [params, setParams] = useState({
    simultaneidade: 'corporativo',
    tipoCondensadora: 'vertical',
    evaporadora: 'hi-wall',
    quantidade: '1',
    nominal: '7'
  });

  type SimultOption = { id: number; nome: string; valor: number };
  const [simultOptions, setSimultOptions] = useState<SimultOption[]>([]);
  const [form, setForm] = useState<{ simultaneidade: SimultOption | null; simultaneidadeValor: number }>({ simultaneidade: null, simultaneidadeValor: 110 });
  const [simultLoading, setSimultLoading] = useState(false);
  const [simultError, setSimultError] = useState<string | null>(null);

  function applyDefaultSimult(opts: SimultOption[]) {
    if (!opts?.length) return;
    const corporativos = opts.filter(o => typeof o.nome === 'string' && o.nome.toLowerCase().startsWith('corporativo'));
    const def = (corporativos.length ? corporativos.reduce((a, b) => (a.valor >= b.valor ? a : b)) : opts[0]);
    setForm({ simultaneidade: def, simultaneidadeValor: def.valor });
  }

  const getSimultPercent = () => {
    const v = form.simultaneidadeValor;
    if (v == null) return 110;
    return v > 10 ? Math.round(v) : Math.round(v * 100);
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setSimultLoading(true);
      const { data, error } = await supabase
        .from('simultaneidade_vrf')
        .select('id, nome, valor')
        .order('valor', { ascending: true })
        .order('nome', { ascending: true });
      if (!active) return;
      if (error || !data) {
        console.error('Erro ao buscar simultaneidade_vrf:', JSON.stringify(error || data));
        // Tenta fallback para tabela legacy 'simultaneidade'
        try {
          const { data: data2, error: error2 } = await supabase
            .from('simultaneidade')
            .select('id, nome, valor')
            .order('valor', { ascending: true })
            .order('nome', { ascending: true });
          if (!active) return;
          if (!error2 && data2 && data2.length) {
            const opts2: SimultOption[] = (data2 || []).map((r: any, idx: number) => ({ id: (r.id ?? idx) as number, nome: String(r.nome), valor: Number(r.valor) }));
            setSimultOptions(opts2);
            setSimultError(null);
            applyDefaultSimult(opts2);
            setSimultLoading(false);
            return;
          }
        } catch (e) {
          console.error('Erro no fallback simultaneidade:', JSON.stringify(e));
        }

        // fallback estático
        setSimultError('Não foi possível carregar as simultaneidades. Tente novamente.');
        setSimultOptions([
          { id: -1, nome: 'Corporativo', valor: 110 },
          { id: -2, nome: 'Residencial', valor: 145 }
        ]);
        applyDefaultSimult([
          { id: -1, nome: 'Corporativo', valor: 110 },
          { id: -2, nome: 'Residencial', valor: 145 }
        ]);
        setSimultLoading(false);
        return;
      }
      const opts: SimultOption[] = (data || []).map((r: any) => ({ id: r.id as number, nome: String(r.nome), valor: Number(r.valor) }));
      setSimultOptions(opts);
      setSimultError(null);
      applyDefaultSimult(opts);
      setSimultLoading(false);
    }
    load();
    return () => { active = false };
  }, []);

  // Estado para lista de evaporadoras adicionadas
  const [evaporators, setEvaporators] = useState<Array<{
    type: string;
    nominal: number;
    realBTU: number;
    qtd: number;
  }>>([]);

  const [results, setResults] = useState<{ samsung: any; daikin: any } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<"samsung" | "daikin">("samsung");
  const [viewMode, setViewMode] = useState<"unidades" | "agrupado">("agrupado");

  const recalculate = () => {
    // Soma todas as evaporadoras (realBTU * qtd)
    const totalCapacity = evaporators.reduce((acc, ev) => acc + (ev.realBTU * ev.qtd), 0);

    if (totalCapacity === 0) {
      setResults(null);
      return;
    }

    const entrada = [totalCapacity];
    const simultaneidadeRaw = form.simultaneidadeValor || 110;

    // Para Samsung, usa a simultaneidade selecionada
    const simultaneidadeSamsung = simultaneidadeRaw;

    // Para Daikin, limita a 130% quando selecionado acima de 130%
    const simultaneidadeDaikin = simultaneidadeRaw > 130 ? 130 : simultaneidadeRaw;

    // Calcula para ambas as marcas com suas respectivas simultaneidades
    const samsungResult = calcularCondensadoraVRF(entrada, simultaneidadeSamsung, "samsung", params.tipoCondensadora as any);
    const daikinResult = calcularCondensadoraVRF(entrada, simultaneidadeDaikin, "daikin", params.tipoCondensadora as any);

    setResults({
      samsung: {
        ...samsungResult,
        orientacao: params.tipoCondensadora,
        simultaneidadeUsada: simultaneidadeSamsung,
        simultaneidadeSelecionada: simultaneidadeRaw
      },
      daikin: {
        ...daikinResult,
        orientacao: params.tipoCondensadora,
        simultaneidadeUsada: simultaneidadeDaikin,
        simultaneidadeSelecionada: simultaneidadeRaw
      }
    });
  };

  const handleAdd = () => {
    const nominal = parseInt(params.nominal) || 7;
    const qtd = parseInt(params.quantidade) || 1;
    const evapMap = getEvaporadorasMap(selectedBrand)[params.evaporadora as keyof ReturnType<typeof getEvaporadorasMap>];
    const realBTU = evapMap?.[nominal as keyof typeof evapMap] || 7507;

    setEvaporators(prev => {
      const exists = prev.find(e => e.type === params.evaporadora && e.nominal === nominal);
      if (exists) {
        // Acumula quantidade se já existe
        return prev.map(e => 
          e.type === params.evaporadora && e.nominal === nominal
            ? { ...e, qtd: e.qtd + qtd }
            : e
        );
      } else {
        // Adiciona nova evaporadora
        return [...prev, { type: params.evaporadora, nominal, realBTU, qtd }];
      }
    });
  };

  const handleChangeQtd = (index: number, value: number) => {
    setEvaporators(prev => {
      const updated = [...prev];
      updated[index].qtd = Math.max(1, Math.floor(value || 1));
      return updated;
    });
  };

  const handleRemove = (index: number) => {
    setEvaporators(prev => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setEvaporators([]);
    setResults(null);
    setParams({ simultaneidade: 'corporativo', tipoCondensadora: 'vertical', evaporadora: 'hi-wall', quantidade: '1', nominal: '7' });
    applyDefaultSimult(simultOptions);
  };

  // Recalcula automaticamente quando evaporators ou simultaneidade/orientação mudam
  useEffect(() => {
    recalculate();
  }, [evaporators, form.simultaneidadeValor, params.tipoCondensadora]);

  // Recalcula evaporadores quando muda de marca
  useEffect(() => {
    setEvaporators(prev => prev.map(evap => {
      const evapMap = getEvaporadorasMap(selectedBrand)[evap.type as keyof ReturnType<typeof getEvaporadorasMap>];
      const newRealBTU = evapMap?.[evap.nominal as keyof typeof evapMap] || evap.realBTU;
      return { ...evap, realBTU: newRealBTU };
    }));
  }, [selectedBrand]);

  return (
    <HVACCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Calculadora de Condensadoras VRF
        </CardTitle>
        <CardDescription>
          Sistema de cálculo para seleção de condensadoras baseado em simultaneidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simultaneidade */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Simultaneidade</h3>
            <div className="space-y-2">
              <Select
                value={form.simultaneidade ? String(form.simultaneidade.id) : ''}
                onValueChange={(value) => {
                  const opt = simultOptions.find(o => String(o.id) === value) || null;
                  if (opt) {
                    setForm({ simultaneidade: opt, simultaneidadeValor: opt.valor });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={simultLoading ? 'Carregando...' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {simultOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>{opt.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.simultaneidade && (
                <p className="text-xs text-muted-foreground">Fator: {form.simultaneidade.nome} (×{form.simultaneidadeValor})</p>
              )}
              {simultError && (
                <p className="text-xs text-red-600 dark:text-red-400">{simultError}</p>
              )}
            </div>
            {/* Alerta para 145% inválido em Vertical */}
            {(() => {
              const invalid145Vertical = getSimultPercent() === 145 && params.tipoCondensadora === 'vertical';
              if (!invalid145Vertical) return null;
              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    Limite Residencial (145%) permitido apenas para Condensadoras Horizontais
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Tipo de Condensadora e Modo */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Tipo de Condensadora</h3>
              <div className="flex gap-2">
                <Button
                  variant={params.tipoCondensadora === 'vertical' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setParams(prev => ({ ...prev, tipoCondensadora: 'vertical' }))}
                >
                  Vertical
                </Button>
                <Button
                  variant={params.tipoCondensadora === 'horizontal' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setParams(prev => ({ ...prev, tipoCondensadora: 'horizontal' }))}
                >
                  Horizontal
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Selecionar Evaporadora</h3>
              <div className="grid grid-cols-3 gap-2">
                <Select value={params.evaporadora} onValueChange={(value) => {
                  const newEvapMap = getEvaporadorasMap(selectedBrand)[value as keyof ReturnType<typeof getEvaporadorasMap>] || {};
                  const availableNominals = Object.keys(newEvapMap);
                  const firstNominal = availableNominals[0] || '7';
                  setParams(prev => ({ ...prev, evaporadora: value, nominal: firstNominal }));
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hi-wall">Hi Wall</SelectItem>
                    <SelectItem value="cassete-1-via">Cassete 1 Via</SelectItem>
                    <SelectItem value="cassete-4-vias">Cassete 4 Vias</SelectItem>
                    <SelectItem value="duto">Duto</SelectItem>
                    <SelectItem value="piso-teto">Piso Teto</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={params.nominal} onValueChange={(value) => setParams(prev => ({ ...prev, nominal: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(getEvaporadorasMap(selectedBrand)[params.evaporadora as keyof ReturnType<typeof getEvaporadorasMap>] || {}).map(([nominal, real]) => (
                      <SelectItem key={nominal} value={nominal}>
                        {nominal} (real {real.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={params.quantidade} onValueChange={(value) => setParams(prev => ({ ...prev, quantidade: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                      <SelectItem key={num} value={num.toString()}>Qtd: {num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd}>
                  Adicionar
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>

            {/* Resultado */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Resultado</h3>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={selectedBrand === "samsung" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBrand("samsung")}
              >
                Samsung
              </Button>

              <Button
                variant={selectedBrand === "daikin" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBrand("daikin")}
              >
                Daikin
              </Button>

            </div>
            
            {results && evaporators.length > 0 ? (
              <div className="space-y-3 text-sm">
                {/* Alerta para 145% inválido em Vertical */}
                {(() => {
                  const invalid145Vertical = getSimultPercent() === 145 && params.tipoCondensadora === 'vertical';
                  return invalid145Vertical;
                })() && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                      Atenção: você selecionou 145% com condensadora Vertical. Essa combinação é inválida.
                    </p>
                  </div>
                )}

                {/* Warning for Daikin quando simultaneidade > 130% */}
                {(() => {
                  return selectedBrand === 'daikin' && getSimultPercent() > 130;
                })() && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                      Na Daikin o limite máximo é 130%. "Limite Residencial (145%)" só é permitido pela Samsung. Os cálculos abaixo consideram 130%.
                    </p>
                  </div>
                )}

                {results[selectedBrand].condensadoraIdeal && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Condensadora ideal: {results[selectedBrand].condensadoraIdeal.nome}{results[selectedBrand].condensadoraIdeal.volt ? ` (${results[selectedBrand].condensadoraIdeal.volt}v)` : ''}</p>
                    <p className="text-muted-foreground">{results[selectedBrand].orientacao} - Cap. real: {results[selectedBrand].condensadoraIdeal.nominal.toLocaleString()} {selectedBrand === "samsung" ? "BTU/h" : "(Daikin)"}</p>
                    <StatusChip className="bg-green-100 text-green-800 mt-1">
                      Simultaneidade: {results[selectedBrand].condensadoraIdeal.simultaneidade}
                    </StatusChip>
                  </div>
                )}
                
                {results[selectedBrand].umaAbaixo && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Uma abaixo: {results[selectedBrand].umaAbaixo.nome}{results[selectedBrand].umaAbaixo.volt ? ` (${results[selectedBrand].umaAbaixo.volt}v)` : ''}</p>
                    <p className="text-muted-foreground">{results[selectedBrand].orientacao} - Cap. real: {results[selectedBrand].umaAbaixo.nominal.toLocaleString()} {selectedBrand === "samsung" ? "BTU/h" : "(Daikin)"}</p>
                    <StatusChip className="bg-red-100 text-red-800 mt-1">
                      Simultaneidade: {results[selectedBrand].umaAbaixo.simultaneidade}
                    </StatusChip>
                  </div>
                )}
                
                {results[selectedBrand].umaAcima && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Uma acima: {results[selectedBrand].umaAcima.nome}{results[selectedBrand].umaAcima.volt ? ` (${results[selectedBrand].umaAcima.volt}v)` : ''}</p>
                    <p className="text-muted-foreground">{results[selectedBrand].orientacao} - Cap. real: {results[selectedBrand].umaAcima.nominal.toLocaleString()} {selectedBrand === "samsung" ? "BTU/h" : "(Daikin)"}</p>
                    <StatusChip className="bg-green-100 text-green-800 mt-1">
                      Simultaneidade: {results[selectedBrand].umaAcima.simultaneidade}
                    </StatusChip>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Adicione evaporadoras para ver os resultados
              </p>
            )}
          </div>
        </div>

        {/* Detalhes */}
        {results && evaporators.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={viewMode === "unidades" ? "default" : "outline"} 
                size="sm"
                onClick={() => setViewMode("unidades")}
              >
                Por unidade
              </Button>
              <Button 
                variant={viewMode === "agrupado" ? "default" : "outline"} 
                size="sm"
                onClick={() => setViewMode("agrupado")}
              >
                Agrupado
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p><strong>Marca:</strong> {results[selectedBrand].marca}</p>
                <p><strong>Simultaneidade (selecionada):</strong> {form.simultaneidadeValor}%
                  {(() => {
                    const invalid145Vertical = getSimultPercent() === 145 && params.tipoCondensadora === 'vertical';
                    return invalid145Vertical ? (
                      <span className="ml-2 inline-flex items-center rounded-md bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">
                        INVÁLIDA p/ Vertical
                      </span>
                    ) : null;
                  })()}
                  {(() => {
                    return selectedBrand === 'daikin' && form.simultaneidadeValor > 130 ? (
                      <span className="text-amber-600 dark:text-amber-400 text-xs ml-2">Capado p/ 130%</span>
                    ) : null;
                  })()}
                </p>
                <p><strong>Capacidade mínima requerida (após simult.):</strong> {results[selectedBrand].capacidadeMinima.toLocaleString()} {selectedBrand === "samsung" ? "BTU/h" : "unidades Daikin"}</p>
              </div>
              <div>
                <p><strong>Orientação:</strong> {results[selectedBrand].orientacao}</p>
                <p><strong>Soma das evaporadoras (válidas):</strong> {results[selectedBrand].somaEvaporadoras.toLocaleString()} {selectedBrand === "samsung" ? "BTU/h" : "unidades Daikin"}</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Nominal</th>
                  <th className="text-left p-2">Real ({selectedBrand === "samsung" ? "BTU/h" : "unidades Daikin"})</th>
                  <th className="text-left p-2">Qtd</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {viewMode === "unidades" ? (
                  // Por unidade - mostra cada linha individualmente
                  evaporators.length > 0 ? evaporators.map((evap, index) => (
                    <tr key={index}>
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{
                        evap.type === 'hi-wall' ? 'Hi Wall' : 
                        evap.type === 'cassete-1-via' ? 'Cassete 1 Via' :
                        evap.type === 'cassete-4-vias' ? 'Cassete 4 Vias' :
                        evap.type === 'duto' ? 'Duto' :
                        evap.type === 'piso-teto' ? 'Piso Teto' : evap.type
                      }</td>
                      <td className="p-2">{evap.nominal}</td>
                      <td className="p-2">{evap.realBTU.toLocaleString()}</td>
                      <td className="p-2">{evap.qtd}</td>
                      <td className="p-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemove(index)}
                          className="h-8"
                        >
                          X
                        </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-2 text-center text-muted-foreground">
                        Adicione evaporadoras para calcular
                      </td>
                    </tr>
                  )
                ) : (
                  // Agrupado - permite editar quantidade
                  evaporators.length > 0 ? evaporators.map((evap, index) => (
                    <tr key={index}>
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{
                        evap.type === 'hi-wall' ? 'Hi Wall' : 
                        evap.type === 'cassete-1-via' ? 'Cassete 1 Via' :
                        evap.type === 'cassete-4-vias' ? 'Cassete 4 Vias' :
                        evap.type === 'duto' ? 'Duto' :
                        evap.type === 'piso-teto' ? 'Piso Teto' : evap.type
                      }</td>
                      <td className="p-2">{evap.nominal}</td>
                      <td className="p-2">{evap.realBTU.toLocaleString()}</td>
                      <td className="p-2">
                        <Input 
                          type="number" 
                          min="1"
                          value={evap.qtd} 
                          onChange={(e) => handleChangeQtd(index, parseInt(e.target.value))} 
                          className="w-16 h-8" 
                        />
                      </td>
                      <td className="p-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemove(index)}
                          className="h-8"
                        >
                          X
                        </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-2 text-center text-muted-foreground">
                        Adicione evaporadoras para calcular
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </HVACCard>
  );
}
