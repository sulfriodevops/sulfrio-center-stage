import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, X } from 'lucide-react';

interface Ambiente {
  nome: string;
  area: number;
  calc: number;
  pd: string;
  ocup: number;
  tipoEvap: string;
}

interface State {
  projeto: string;
  local: string;
  asbuilt: string;
  ambientes: Ambiente[];
  lastCalc: number;
  lastTipoEvap: string;
}

export default function DiariasCalculator() {
  const [state, setState] = useState<State>({
    projeto: "Residencial",
    local: "Capital",
    asbuilt: "Não",
    ambientes: [],
    lastCalc: 1000,
    lastTipoEvap: "Dutado"
  });

  const [formData, setFormData] = useState({
    nome: "",
    area: "",
    calc: 1000,
    pd: "Não",
    ocupacao: "",
    tipoEvap: "Dutado"
  });

  const [projectInfo, setProjectInfo] = useState({
    arquiteto: "",
    telefone: "",
    endereco: "",
    processo: ""
  });

  const formatTelefone = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length === 0) return "";
    const dd = d;
    const p1 = dd.slice(0, 2);
    const rest = dd.slice(2);
    if (dd.length <= 2) return `(${p1}`;
    if (dd.length <= 6) return `(${p1}) ${rest}`;
    if (dd.length <= 10) return `(${p1}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    return `(${p1}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  };

  const fmt = (n: number) => Number(n).toLocaleString("pt-BR");

  const addAmbiente = () => {
    const nome = formData.nome.trim();
    const area = Number(formData.area);
    const calc = Number(formData.calc);
    const pd = formData.pd || "Não";
    const ocup = Number(formData.ocupacao) || 0;
    const tipoEvap = formData.tipoEvap || "Dutado";

    if (!nome || !area) return;

    const newAmbiente: Ambiente = { nome, area, calc, pd, ocup, tipoEvap };
    
    setState(prev => ({
      ...prev,
      ambientes: [...prev.ambientes, newAmbiente],
      lastCalc: calc,
      lastTipoEvap: tipoEvap
    }));

    setFormData({
      nome: "",
      area: "",
      calc: state.lastCalc,
      pd: "Não",
      ocupacao: "",
      tipoEvap: state.lastTipoEvap
    });
  };

  const clearList = () => {
    setState(prev => ({ ...prev, ambientes: [] }));
  };

  const removeAmbiente = (index: number) => {
    setState(prev => ({
      ...prev,
      ambientes: prev.ambientes.filter((_, i) => i !== index)
    }));
  };

  const copyAmbiente = (index: number) => {
    const clone = { ...state.ambientes[index] };
    setState(prev => ({
      ...prev,
      ambientes: [...prev.ambientes, clone]
    }));
  };

  const updateAmbiente = (index: number, field: keyof Ambiente, value: any) => {
    setState(prev => ({
      ...prev,
      ambientes: prev.ambientes.map((amb, i) => 
        i === index ? { ...amb, [field]: value } : amb
      )
    }));
  };

  const calculateResults = () => {
    if (state.ambientes.length === 0) {
      return {
        resultado: "— Sem resultados ainda —",
        detalhes: [] as any[],
        dias: 0
      };
    }

    let somaDut = 0, somaApar = 0;
    const ambientesCalculados = state.ambientes.map(a => {
      let cap = a.area * a.calc + (a.ocup || 0) * 500;
      if (a.pd === "Sim") cap *= 1.3;
      cap *= (state.local === "Capital" ? 1.0 : 1.15);
      const tr = cap / 12000;
      const hp = cap / 9600;
      const m2tr = a.area / (tr || 1);

      if (a.tipoEvap === "Dutado") {
        somaDut += (state.projeto === "Residencial" ? tr / 10 : tr / 7);
      } else {
        somaApar += (state.projeto === "Residencial" ? tr / 16 : tr / 11);
      }

      return { ...a, cap, tr, hp, m2tr };
    });

    let dias = somaDut + somaApar * 1.4;
    dias *= (state.asbuilt === "Sim" ? 1.3 : 1.0);
    dias = Math.ceil(dias);

    return {
      resultado: `Estimativa de Diárias: ${dias} | Estimativa de Hora Útil: ${dias * 8}`,
      detalhes: ambientesCalculados,
      dias
    };
  };

  const { resultado, detalhes, dias } = calculateResults();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAmbiente();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">Calculadora de Diárias de Projetos</h1>
        <p className="text-center text-muted-foreground mb-8"></p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações do Projeto */}
          <Card className="p-6 lg:col-span-2">
            <Label className="mb-4 block">Informações do Projeto</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Arquiteto responsável</Label>
                <Input
                  placeholder="Nome do arquiteto responsável"
                  value={projectInfo.arquiteto}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, arquiteto: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-2 block">Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  value={projectInfo.telefone}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, telefone: formatTelefone(e.target.value) }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-2 block">Endereço da obra</Label>
                <Input
                  placeholder="Endereço completo da obra"
                  value={projectInfo.endereco}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-2 block">Número do processo</Label>
                <Input
                  placeholder="Número do processo"
                  value={projectInfo.processo}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, processo: e.target.value }))}
                />
              </div>
            </div>
          </Card>
          {/* Configurações */}
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="mb-3 block">Tipo de Projeto</Label>
                <div className="flex gap-2">
                  {["Residencial", "Corporativo"].map(tipo => (
                    <Badge
                      key={tipo}
                      variant={state.projeto === tipo ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => setState(prev => ({ ...prev, projeto: tipo }))}
                    >
                      {tipo}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Localidade</Label>
                <div className="flex gap-2">
                  {["Capital", "Interior"].map(local => (
                    <Badge
                      key={local}
                      variant={state.local === local ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => setState(prev => ({ ...prev, local }))}
                    >
                      {local === "Interior" ? "Interior/Litoral" : local}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Resultado */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Label>Resultado</Label>
              <div>
                <Label className="mb-2 block">As Built?</Label>
                <div className="flex gap-2">
                  {["Sim", "Não"].map(asbuilt => (
                    <Badge
                      key={asbuilt}
                      variant={state.asbuilt === asbuilt ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => setState(prev => ({ ...prev, asbuilt }))}
                    >
                      {asbuilt}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-sm">
              {dias ? (
                <div>
                  <strong>Estimativa de Diárias:</strong> <strong className="text-orange-500">{dias}</strong><br />
                  <strong>Estimativa de Hora Útil:</strong> <strong>{dias * 8}</strong>
                </div>
              ) : (
                <span className="text-muted-foreground">{resultado}</span>
              )}
            </div>
          </Card>

          {/* Adicionar Ambiente */}
          <Card className="p-6 lg:col-span-2">
            <Label className="mb-4 block">Adicionar Ambiente</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                placeholder="Nome do ambiente"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                onKeyPress={handleKeyPress}
              />
              <Input
                type="number"
                placeholder="Área (m²)"
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                onKeyPress={handleKeyPress}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.calc}
                onChange={(e) => setFormData(prev => ({ ...prev, calc: Number(e.target.value) }))}
              >
                <option value="700">700</option>
                <option value="1000">1000</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.pd}
                onChange={(e) => setFormData(prev => ({ ...prev, pd: e.target.value }))}
              >
                <option value="Não">P.D. Normal</option>
                <option value="Sim">P.D. Duplo</option>
              </select>
              <Input
                type="number"
                placeholder="Ocupação"
                value={formData.ocupacao}
                onChange={(e) => setFormData(prev => ({ ...prev, ocupacao: e.target.value }))}
                onKeyPress={handleKeyPress}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.tipoEvap}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoEvap: e.target.value }))}
              >
                <option value="Dutado">Dutado</option>
                <option value="Hi Wall">Hi Wall</option>
                <option value="K7 1via">K7 1via</option>
                <option value="K7 4vias">K7 4vias</option>
                <option value="Piso Teto">Piso Teto</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addAmbiente}>Adicionar Ambiente</Button>
              <Button variant="outline" onClick={clearList}>Limpar Lista</Button>
            </div>
          </Card>

          {/* Detalhes */}
          <Card className="p-6 lg:col-span-2">
            <Label className="mb-4 block">Detalhes</Label>
            {detalhes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Ambiente</th>
                      <th className="text-left p-2">Área</th>
                      <th className="text-left p-2">P.D. Duplo?</th>
                      <th className="text-left p-2">Ocupação</th>
                      <th className="text-left p-2">Cálculo</th>
                      <th className="text-left p-2">BTU/h</th>
                      <th className="text-left p-2">TR</th>
                      <th className="text-left p-2">HP</th>
                      <th className="text-left p-2">M²/TR</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhes.map((amb, i) => (
                      <tr key={i} className="border-b border-dashed">
                        <td className="p-2">
                          <Input
                            value={amb.nome}
                            onChange={(e) => updateAmbiente(i, 'nome', e.target.value)}
                            className="text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={amb.area}
                            onChange={(e) => updateAmbiente(i, 'area', Number(e.target.value))}
                            className="text-sm w-20"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={amb.pd}
                            onChange={(e) => updateAmbiente(i, 'pd', e.target.value)}
                            className="text-sm w-16 rounded border border-input bg-background px-2 py-1"
                          >
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={amb.ocup}
                            onChange={(e) => updateAmbiente(i, 'ocup', Number(e.target.value))}
                            className="text-sm w-16"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={amb.calc}
                            onChange={(e) => updateAmbiente(i, 'calc', Number(e.target.value))}
                            className="text-sm w-16 rounded border border-input bg-background px-2 py-1"
                          >
                            <option value="700">700</option>
                            <option value="1000">1000</option>
                          </select>
                        </td>
                        <td className="p-2 text-sm">{fmt(amb.cap)}</td>
                        <td className="p-2 text-sm">{amb.tr.toFixed(2)}</td>
                        <td className="p-2 text-sm">{amb.hp.toFixed(2)}</td>
                        <td className="p-2 text-sm">{amb.m2tr.toFixed(2)}</td>
                        <td className="p-2">
                          <select
                            value={amb.tipoEvap}
                            onChange={(e) => updateAmbiente(i, 'tipoEvap', e.target.value)}
                            className="text-sm w-24 rounded border border-input bg-background px-2 py-1"
                          >
                            <option value="Dutado">Dutado</option>
                            <option value="Hi Wall">Hi Wall</option>
                            <option value="K7 1via">K7 1via</option>
                            <option value="K7 4vias">K7 4vias</option>
                            <option value="Piso Teto">Piso Teto</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyAmbiente(i)}
                              className="w-8 h-8 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeAmbiente(i)}
                              className="w-8 h-8 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <span className="text-muted-foreground">Adicione ambientes para ver os cálculos.</span>
            )}
          </Card>
        </div>

        <footer className="flex justify-center items-center mt-8">
          <img 
            src="/lovable-uploads/62ef3cac-2a46-4916-8f53-2ff94d9ca0e4.png" 
            alt="logo sulfrio" 
            className="max-w-12 h-12 object-contain"
          />
        </footer>
      </div>
    </div>
  );
}
