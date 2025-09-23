import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Package, Factory } from 'lucide-react';

// Shared utilities
const useDebouncedValue = (value: string, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const byString = (v?: string | null) => (v ?? '').toString();

// VRF Evaporators
type EvapRow = {
  id: number;
  marca: string;
  tipo: string;
  modelo: string | null;
  nominal: number | null;
  real: number;
  active?: boolean | null;
};

// VRF Condensers
type CondRow = {
  id: number;
  marca: string;
  hp: number;
  real: number;
  orientacao: string;
  voltagem: string | null;
  modelo: string | null;
  tipo?: string | null;
  active?: boolean | null;
};

// Multi Split
type MultiRow = {
  id: string;
  fabricante: string;
  tipo: string;
  nome: string;
  modelo: string;
  cap_nominal: number;
  cap_max: number;
  max_evaps: number | null;
  combinacoes: any;
  active?: boolean | null;
};

const PAGE_SIZES = [20, 50, 100];

const SectionHeader: React.FC<{ title: string; onNew: () => void; newLabel: string; right?: React.ReactNode }>
  = ({ title, onNew, newLabel, right }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-semibold">{title}</h3>
    <div className="flex items-center gap-3">
      {right}
      <Button onClick={onNew}>
        <Plus className="h-4 w-4 mr-2" />
        {newLabel}
      </Button>
    </div>
  </div>
);

function useActiveSupport<T extends { active?: boolean | null }>(rows: T[]): boolean {
  return useMemo(() => rows.some(r => typeof r.active === 'boolean'), [rows]);
}

// Distinct helpers (client-side dedupe for now)
function uniqueSorted(values: (string | null)[]): string[] {
  const set = new Set(values.filter((v): v is string => !!v && v.trim() !== ''));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// VRF Evaporators Card
const VrfEvapCard: React.FC = () => {
  const [rows, setRows] = useState<EvapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ col: keyof EvapRow, dir: 'asc' | 'desc' }>({ col: 'marca', dir: 'asc' });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EvapRow | null>(null);
  const [form, setForm] = useState<{ marca: string; tipo: string; modelo: string; nominal: string; real: string }>({ marca: '', tipo: '', modelo: '', nominal: '', real: '' });
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const hasActive = useActiveSupport(rows);

  const fetchDistincts = async () => {
    const { data: tdata, error: terr } = await supabase
      .from('vrf_evap_produtos' as any)
      .select('tipo');
    if (!terr && tdata) setTypeOptions(uniqueSorted(tdata.map(r => byString((r as any).tipo))));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const from = supabase.from('vrf_evap_produtos' as any).select('*');
      // Filters
      if (brandFilter) (from as any).ilike('marca', `%${brandFilter}%`);
      if (typeFilter) (from as any).ilike('tipo', `%${typeFilter}%`);
      if (debouncedSearch) {
        (from as any).or(`marca.ilike.%${debouncedSearch}%,tipo.ilike.%${debouncedSearch}%,modelo.ilike.%${debouncedSearch}%`);
      }
      if (!showInactive) {
        // Try to filter by active if the column exists at DB level. If not, query will just error and we ignore silently by fetching without this filter
        const withActive = await from.clone().limit(1).select('active');
        if (!(withActive as any).error) {
          (from as any).eq('active', true);
        }
      }
      (from as any).order('marca', { ascending: true }).order('modelo', { ascending: true });

      // Pagination (manual since count not requested)
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      (from as any).range(start, end);

      const { data, error } = await (from as any);
      if (error) throw error;
      setRows((data || []) as EvapRow[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao carregar evaporadoras', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, brandFilter, typeFilter, page, pageSize, sort, showInactive]);

  useEffect(() => {
    fetchDistincts();
  }, []);

  const brands = useMemo(() => uniqueSorted(rows.map(r => r.marca)), [rows]);
  const types = useMemo(() => uniqueSorted(rows.map(r => r.tipo)), [rows]);

  const openNew = () => {
    setEditing(null);
    setForm({ marca: '', tipo: '', modelo: '', nominal: '', real: '' });
    setEditOpen(true);
  };

  const openEdit = (r: EvapRow) => {
    setEditing(r);
    setForm({
      marca: r.marca || '',
      tipo: r.tipo || '',
      modelo: r.modelo || '',
      nominal: r.nominal != null ? String(r.nominal) : '',
      real: r.real != null ? String(r.real) : '',
    });
    setEditOpen(true);
  };

  const validate = () => {
    if (!form.marca.trim() || !form.tipo.trim() || !form.modelo.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Marca, Tipo e Modelo são obrigatórios', variant: 'destructive' });
      return false;
    }
    const nominal = Number(form.nominal);
    const real = Number(form.real);
    if (!Number.isFinite(nominal) || !Number.isFinite(real)) {
      toast({ title: 'Valores inválidos', description: 'Nominal e Real devem ser numéricos', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    const payload: any = {
      marca: form.marca.trim(),
      tipo: form.tipo.trim(),
      modelo: form.modelo.trim(),
      nominal: Number(form.nominal),
      real: Number(form.real),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('vrf_evap_produtos' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Atualizado', description: 'Produto atualizado com sucesso' });
      } else {
        // Try to set active=true if column exists
        const probe = await supabase.from('vrf_evap_produtos' as any).select('active').limit(1);
        if (!(probe as any).error) payload.active = true;
        const { error } = await supabase.from('vrf_evap_produtos' as any).insert([payload]);
        if (error) throw error;
        toast({ title: 'Criado', description: 'Produto criado com sucesso' });
      }
      setEditOpen(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: e.message || 'Falha ao salvar', variant: 'destructive' });
    }
  };

  const inactivate = async (r: EvapRow) => {
    try {
      const { error } = await supabase.from('vrf_evap_produtos' as any).update({ active: false } as any).eq('id', r.id);
      if (error) throw error;
      toast({ title: 'Inativado', description: 'Produto marcado como inativo' });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Não foi possível inativar',
        description: 'A coluna active pode não existir. Conecte um provedor de banco (Neon/Supabase) para criá-la e tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" /> Evaporadoras
        </CardTitle>
        <CardDescription>Lista e cadastro de evaporadoras VRF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionHeader
          title="Evaporadoras"
          newLabel="Novo Produto (Evaporadora)"
          onNew={openNew}
          right={
            <div className="flex items-center gap-4">
              {hasActive && (
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="evap-inactive">Mostrar inativos</Label>
                  <Switch id="evap-inactive" checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
                </div>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em marca/tipo/modelo..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {brands.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {types.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Itens por página</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (<SelectItem key={s} value={String(s)}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Real</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6">Carregando...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className={r.active === false ? 'bg-destructive/10' : ''}>
                  <TableCell>{r.marca}</TableCell>
                  <TableCell>{r.tipo}</TableCell>
                  <TableCell>{r.modelo}</TableCell>
                  <TableCell>{r.nominal}</TableCell>
                  <TableCell>{r.real}</TableCell>
                  <TableCell>{r.active === false ? <Badge variant="destructive">Inativo</Badge> : <Badge>Ativo</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Inativar produto?</AlertDialogTitle>
                            <AlertDialogDescription>Isso irá marcar o produto como inativo.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => inactivate(r)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Página {page}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Evaporadora' : 'Novo Produto (Evaporadora)'}</DialogTitle>
              <DialogDescription>Preencha os dados abaixo</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Marca</Label>
                <Input placeholder="Samsung / Daikin" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo</Label>
                <Input placeholder="VEWS28 / FXAQ32" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div>
                <Label>Nominal</Label>
                <Input type="number" placeholder="7 / 12" value={form.nominal} onChange={e => setForm(f => ({ ...f, nominal: e.target.value }))} />
              </div>
              <div>
                <Label>Real</Label>
                <Input type="number" placeholder="23203 / 31.25" value={form.real} onChange={e => setForm(f => ({ ...f, real: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={save}>Salvar</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// VRF Condensers Card
const VrfCondCard: React.FC = () => {
  const [rows, setRows] = useState<CondRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [oriFilter, setOriFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CondRow | null>(null);
  const [form, setForm] = useState<{ marca: string; hp: string; real: string; orientacao: string; voltagem: string; modelo: string }>(
    { marca: '', hp: '', real: '', orientacao: '', voltagem: '', modelo: '' }
  );
  const [oriOptions, setOriOptions] = useState<string[]>([]);

  const hasActive = useActiveSupport(rows);

  const fetchDistincts = async () => {
    const { data, error } = await supabase.from('vrf_cond_produtos' as any).select('orientacao');
    if (!error && data) setOriOptions(uniqueSorted(data.map(r => byString((r as any).orientacao))));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const from = supabase.from('vrf_cond_produtos' as any).select('*');
      if (brandFilter) (from as any).ilike('marca', `%${brandFilter}%`);
      if (oriFilter) (from as any).ilike('orientacao', `%${oriFilter}%`);
      if (debouncedSearch) (from as any).or(`marca.ilike.%${debouncedSearch}%,modelo.ilike.%${debouncedSearch}%,orientacao.ilike.%${debouncedSearch}%,voltagem.ilike.%${debouncedSearch}%`);
      if (!showInactive) {
        const probe = await from.clone().limit(1).select('active');
        if (!(probe as any).error) (from as any).eq('active', true);
      }
      (from as any).order('marca', { ascending: true }).order('hp', { ascending: true });
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      (from as any).range(start, end);
      const { data, error } = await (from as any);
      if (error) throw error;
      setRows((data || []) as CondRow[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao carregar condensadoras', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [debouncedSearch, brandFilter, oriFilter, page, pageSize, showInactive]);
  useEffect(() => { fetchDistincts(); }, []);

  const brands = useMemo(() => uniqueSorted(rows.map(r => r.marca)), [rows]);
  const oris = useMemo(() => uniqueSorted(rows.map(r => r.orientacao)), [rows]);

  const openNew = () => {
    setEditing(null);
    setForm({ marca: '', hp: '', real: '', orientacao: '', voltagem: '', modelo: '' });
    setEditOpen(true);
  };
  const openEdit = (r: CondRow) => {
    setEditing(r);
    setForm({
      marca: r.marca || '',
      hp: String(r.hp ?? ''),
      real: String(r.real ?? ''),
      orientacao: r.orientacao || '',
      voltagem: r.voltagem || '',
      modelo: r.modelo || '',
    });
    setEditOpen(true);
  };

  const validate = () => {
    if (!form.marca.trim() || !form.orientacao.trim() || !form.modelo.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Marca, Orientação e Modelo são obrigatórios', variant: 'destructive' });
      return false;
    }
    if (!Number.isInteger(Number(form.hp))) {
      toast({ title: 'HP inválido', description: 'HP deve ser inteiro', variant: 'destructive' });
      return false;
    }
    if (!Number.isFinite(Number(form.real))) {
      toast({ title: 'Real inválido', description: 'Real deve ser numérico', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    const payload: any = {
      marca: form.marca.trim(),
      hp: Number(form.hp),
      real: Number(form.real),
      orientacao: form.orientacao.trim(),
      voltagem: form.voltagem.trim() || null,
      modelo: form.modelo.trim(),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('vrf_cond_produtos' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Atualizado', description: 'Produto atualizado' });
      } else {
        const probe = await supabase.from('vrf_cond_produtos' as any).select('active').limit(1);
        if (!(probe as any).error) payload.active = true;
        const { error } = await supabase.from('vrf_cond_produtos' as any).insert([payload]);
        if (error) throw error;
        toast({ title: 'Criado', description: 'Produto criado' });
      }
      setEditOpen(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: e.message || 'Falha ao salvar', variant: 'destructive' });
    }
  };

  const inactivate = async (r: CondRow) => {
    try {
      const { error } = await supabase.from('vrf_cond_produtos' as any).update({ active: false } as any).eq('id', r.id);
      if (error) throw error;
      toast({ title: 'Inativado', description: 'Produto marcado como inativo' });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Não foi possível inativar',
        description: 'A coluna active pode não existir. Conecte um provedor de banco (Neon/Supabase) para criá-la e tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" /> Condensadoras
        </CardTitle>
        <CardDescription>Lista e cadastro de condensadoras VRF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionHeader
          title="Condensadoras"
          newLabel="Novo Produto (Condensadora)"
          onNew={openNew}
          right={
            <div className="flex items-center gap-4">
              {hasActive && (
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="cond-inactive">Mostrar inativos</Label>
                  <Switch id="cond-inactive" checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
                </div>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em marca/modelo/orientação/voltagem..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {brands.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Orientação</Label>
            <Select value={oriFilter} onValueChange={setOriFilter}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {oris.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Itens por página</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (<SelectItem key={s} value={String(s)}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca</TableHead>
                <TableHead>HP</TableHead>
                <TableHead>Real</TableHead>
                <TableHead>Orientação</TableHead>
                <TableHead>Voltagem</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6">Carregando...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className={r.active === false ? 'bg-destructive/10' : ''}>
                  <TableCell>{r.marca}</TableCell>
                  <TableCell>{r.hp}</TableCell>
                  <TableCell>{r.real}</TableCell>
                  <TableCell>{r.orientacao}</TableCell>
                  <TableCell>{r.voltagem}</TableCell>
                  <TableCell>{r.modelo}</TableCell>
                  <TableCell>{r.active === false ? <Badge variant="destructive">Inativo</Badge> : <Badge>Ativo</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Inativar produto?</AlertDialogTitle>
                            <AlertDialogDescription>Isso irá marcar o produto como inativo.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => inactivate(r)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Página {page}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Condensadora' : 'Novo Produto (Condensadora)'}</DialogTitle>
              <DialogDescription>Preencha os dados abaixo</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Marca</Label>
                <Input placeholder="Samsung / Daikin" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
              </div>
              <div>
                <Label>HP</Label>
                <Input type="number" placeholder="14" value={form.hp} onChange={e => setForm(f => ({ ...f, hp: e.target.value }))} />
              </div>
              <div>
                <Label>Real</Label>
                <Input type="number" placeholder="136486 / 250" value={form.real} onChange={e => setForm(f => ({ ...f, real: e.target.value }))} />
              </div>
              <div>
                <Label>Orientação</Label>
                <Select value={form.orientacao} onValueChange={(v) => setForm(f => ({ ...f, orientacao: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {oriOptions.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Voltagem (opcional)</Label>
                <Input placeholder="220V / 380V / 220" value={form.voltagem} onChange={e => setForm(f => ({ ...f, voltagem: e.target.value }))} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input placeholder="VCHS14 / VCVD50" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={save}>Salvar</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Multi Split Tab
const MultiSplitTab: React.FC = () => {
  const [rows, setRows] = useState<MultiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [manFilter, setManFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MultiRow | null>(null);
  const [form, setForm] = useState<{ fabricante: string; tipo: string; nome: string; modelo: string; cap_nominal: string; cap_max: string; max_evaps: string; combinacoes: string }>(
    { fabricante: '', tipo: '', nome: '', modelo: '', cap_nominal: '', cap_max: '', max_evaps: '', combinacoes: '' }
  );
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const hasActive = useActiveSupport(rows);

  const fetchDistincts = async () => {
    const { data, error } = await supabase.from('multi_produtos' as any).select('tipo');
    if (!error && data) setTypeOptions(uniqueSorted(data.map(r => byString((r as any).tipo))));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const from = supabase.from('multi_produtos' as any).select('*');
      if (manFilter) (from as any).ilike('fabricante', `%${manFilter}%`);
      if (typeFilter) (from as any).ilike('tipo', `%${typeFilter}%`);
      if (debouncedSearch) (from as any).or(`fabricante.ilike.%${debouncedSearch}%,tipo.ilike.%${debouncedSearch}%,nome.ilike.%${debouncedSearch}%,modelo.ilike.%${debouncedSearch}%`);
      if (!showInactive) {
        const probe = await from.clone().limit(1).select('active');
        if (!(probe as any).error) (from as any).eq('active', true);
      }
      (from as any).order('fabricante', { ascending: true }).order('nome', { ascending: true });
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      (from as any).range(start, end);
      const { data, error } = await (from as any);
      if (error) throw error;
      setRows((data || []) as MultiRow[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao carregar produtos Multi Split', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [debouncedSearch, manFilter, typeFilter, page, pageSize, showInactive]);
  useEffect(() => { fetchDistincts(); }, []);

  const mans = useMemo(() => uniqueSorted(rows.map(r => r.fabricante)), [rows]);
  const types = useMemo(() => uniqueSorted(rows.map(r => r.tipo)), [rows]);

  const openNew = () => {
    setEditing(null);
    setForm({ fabricante: '', tipo: '', nome: '', modelo: '', cap_nominal: '', cap_max: '', max_evaps: '', combinacoes: '' });
    setEditOpen(true);
  };
  const openEdit = (r: MultiRow) => {
    setEditing(r);
    setForm({
      fabricante: r.fabricante || '',
      tipo: r.tipo || '',
      nome: r.nome || '',
      modelo: r.modelo || '',
      cap_nominal: String(r.cap_nominal ?? ''),
      cap_max: String(r.cap_max ?? ''),
      max_evaps: r.max_evaps != null ? String(r.max_evaps) : '',
      combinacoes: r.combinacoes ? JSON.stringify(r.combinacoes) : '',
    });
    setEditOpen(true);
  };

  const validate = () => {
    if (!form.fabricante.trim() || !form.tipo.trim() || !form.nome.trim() || !form.modelo.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Fabricante, Tipo, Nome e Modelo são obrigatórios', variant: 'destructive' });
      return false;
    }
    if (!Number.isInteger(Number(form.cap_nominal)) || !Number.isInteger(Number(form.cap_max))) {
      toast({ title: 'Capacidades inválidas', description: 'Capacidades devem ser inteiras', variant: 'destructive' });
      return false;
    }
    if (form.max_evaps && !Number.isInteger(Number(form.max_evaps))) {
      toast({ title: 'Máx. Evaps inválido', description: 'Deve ser inteiro', variant: 'destructive' });
      return false;
    }
    try {
      if (!form.combinacoes.trim()) throw new Error('');
      JSON.parse(form.combinacoes);
    } catch {
      toast({ title: 'JSON inválido', description: 'Composições devem ser JSON válido', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    const payload: any = {
      fabricante: form.fabricante.trim(),
      tipo: form.tipo.trim(),
      nome: form.nome.trim(),
      modelo: form.modelo.trim(),
      cap_nominal: Number(form.cap_nominal),
      cap_max: Number(form.cap_max),
      max_evaps: form.max_evaps ? Number(form.max_evaps) : null,
      combinacoes: JSON.parse(form.combinacoes),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('multi_produtos' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Atualizado', description: 'Produto atualizado' });
      } else {
        const probe = await supabase.from('multi_produtos' as any).select('active').limit(1);
        if (!(probe as any).error) payload.active = true;
        const { error } = await supabase.from('multi_produtos' as any).insert([payload]);
        if (error) throw error;
        toast({ title: 'Criado', description: 'Produto criado' });
      }
      setEditOpen(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: e.message || 'Falha ao salvar', variant: 'destructive' });
    }
  };

  const inactivate = async (r: MultiRow) => {
    try {
      const { error } = await supabase.from('multi_produtos' as any).update({ active: false } as any).eq('id', r.id);
      if (error) throw error;
      toast({ title: 'Inativado', description: 'Produto marcado como inativo' });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Não foi possível inativar',
        description: 'A coluna active pode não existir. Conecte um provedor de banco (Neon/Supabase) para criá-la e tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi Split</CardTitle>
        <CardDescription>Cadastro de produtos Multi Split</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SectionHeader
          title="Multi Split"
          newLabel="Novo Produto (Multi Split)"
          onNew={openNew}
          right={
            <div className="flex items-center gap-4">
              {hasActive && (
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="multi-inactive">Mostrar inativos</Label>
                  <Switch id="multi-inactive" checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
                </div>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar em fabricante/tipo/nome/modelo..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Fabricante</Label>
            <Select value={manFilter} onValueChange={setManFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {mans.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {types.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Itens por página</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (<SelectItem key={s} value={String(s)}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabricante</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Cap. Nominal</TableHead>
                <TableHead>Cap. Máx</TableHead>
                <TableHead>Máx. Evaps</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-6">Carregando...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className={r.active === false ? 'bg-destructive/10' : ''}>
                  <TableCell>{r.fabricante}</TableCell>
                  <TableCell>{r.tipo}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell>{r.modelo}</TableCell>
                  <TableCell>{r.cap_nominal}</TableCell>
                  <TableCell>{r.cap_max}</TableCell>
                  <TableCell>{r.max_evaps ?? '-'}</TableCell>
                  <TableCell>{r.active === false ? <Badge variant="destructive">Inativo</Badge> : <Badge>Ativo</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Inativar produto?</AlertDialogTitle>
                            <AlertDialogDescription>Isso irá marcar o produto como inativo.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => inactivate(r)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Página {page}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Multi Split' : 'Novo Produto (Multi Split)'}</DialogTitle>
              <DialogDescription>Preencha os dados abaixo</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fabricante</Label>
                <Input placeholder="LG / Samsung / Daikin" value={form.fabricante} onChange={e => setForm(f => ({ ...f, fabricante: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome</Label>
                <Input placeholder="Multi Inverter 36k" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input placeholder="MU3R36" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div>
                <Label>Cap. Nominal</Label>
                <Input type="number" placeholder="36000" value={form.cap_nominal} onChange={e => setForm(f => ({ ...f, cap_nominal: e.target.value }))} />
              </div>
              <div>
                <Label>Cap. Máx</Label>
                <Input type="number" placeholder="42000" value={form.cap_max} onChange={e => setForm(f => ({ ...f, cap_max: e.target.value }))} />
              </div>
              <div>
                <Label>Máx. Evaps (opcional)</Label>
                <Input type="number" placeholder="4" value={form.max_evaps} onChange={e => setForm(f => ({ ...f, max_evaps: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Combinações (JSON)</Label>
                <Input placeholder='[{"evap":9000,"qty":2},{"evap":12000,"qty":1}]' value={form.combinacoes} onChange={e => setForm(f => ({ ...f, combinacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={save}>Salvar</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const ProductRegistrationTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro de Produtos</CardTitle>
        <CardDescription>Gerencie produtos VRF e Multi Split</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="vrf">
          <TabsList>
            <TabsTrigger value="vrf">VRF</TabsTrigger>
            <TabsTrigger value="multi">Multi Split</TabsTrigger>
          </TabsList>
          <TabsContent value="vrf" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VrfEvapCard />
              <VrfCondCard />
            </div>
          </TabsContent>
          <TabsContent value="multi">
            <MultiSplitTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProductRegistrationTab;
