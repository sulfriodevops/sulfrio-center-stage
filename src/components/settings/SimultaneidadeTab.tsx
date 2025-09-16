import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Settings2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface SimultaneidadeData {
  id: number;
  nome: string;
  valor: number;
}

type SimultaneidadeType = 'multi' | 'vrf';

const SimultaneidadeTab = () => {
  const [data, setData] = useState<SimultaneidadeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'nome' | 'valor'>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedType, setSelectedType] = useState<SimultaneidadeType>('multi');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SimultaneidadeData | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    valor: ''
  });

  const itemsPerPage = 25;

  useEffect(() => {
    fetchData();
  }, [selectedType, searchTerm, sortBy, sortDir, currentPage]);

  const getTableName = (type: SimultaneidadeType) => {
    return type === 'multi' ? 'simultaneidade' : 'simultaneidade_vrf';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const tableName = getTableName(selectedType);
      const offset = (currentPage - 1) * itemsPerPage;
      
      let query: any;
      
      if (searchTerm) {
        query = supabase
          .from(tableName as any)
          .select('*')
          .ilike('nome', `%${searchTerm}%`)
          .order(sortBy, { ascending: sortDir === 'asc' })
          .range(offset, offset + itemsPerPage - 1);
      } else {
        query = supabase
          .from(tableName as any)
          .select('*')
          .order(sortBy, { ascending: sortDir === 'asc' })
          .range(offset, offset + itemsPerPage - 1);
      }

      const { data: result, error } = await query;

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    const valor = parseFloat(formData.valor);
    if (isNaN(valor)) {
      toast({
        title: "Erro",
        description: "Valor deve ser um número válido",
        variant: "destructive"
      });
      return false;
    }

    if (selectedType === 'vrf' && valor <= 0) {
      toast({
        title: "Erro",
        description: "Valor deve ser maior que zero",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const tableName = getTableName(selectedType);
      const valor = parseFloat(formData.valor);
      const insertData = { nome: formData.nome.trim(), valor };

      if (editingItem) {
        const { error } = await supabase
          .from(tableName as any)
          .update(insertData)
          .eq('id', editingItem.id);

        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe simultaneidade com esse nome.');
          }
          throw error;
        }
        
        toast({
          title: "Sucesso",
          description: "Simultaneidade atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from(tableName as any)
          .insert([insertData]);

        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe simultaneidade com esse nome.');
          }
          throw error;
        }
        
        toast({
          title: "Sucesso",
          description: "Simultaneidade criada com sucesso"
        });
      }
      
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving simultaneidade:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar simultaneidade",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: SimultaneidadeData) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      valor: item.valor.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: SimultaneidadeData) => {
    if (!confirm(`Tem certeza que deseja excluir ${item.nome}?`)) return;
    
    try {
      const tableName = getTableName(selectedType);
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      
      fetchData();
      toast({
        title: "Sucesso",
        description: "Simultaneidade excluída com sucesso"
      });
    } catch (error) {
      console.error('Error deleting simultaneidade:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir simultaneidade",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', valor: '' });
    setEditingItem(null);
  };

  const openNewItemDialog = (type: SimultaneidadeType) => {
    setSelectedType(type);
    setIsTypeDialogOpen(false);
    resetForm();
    setIsDialogOpen(true);
  };

  const formatValue = (value: number) => {
    return selectedType === 'vrf' 
      ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value.toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Cadastro de Simultaneidade
        </CardTitle>
        <CardDescription>
          Gerencie os valores de simultaneidade para Multi Split e VRF
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor de Tipo */}
        <div className="flex items-center justify-between">
          <ToggleGroup 
            type="single" 
            value={selectedType} 
            onValueChange={(value) => value && setSelectedType(value as SimultaneidadeType)}
            className="justify-start"
          >
            <ToggleGroupItem value="multi" aria-label="Multi Split">
              Multi Split
            </ToggleGroupItem>
            <ToggleGroupItem value="vrf" aria-label="VRF">
              VRF
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Botão Nova Simultaneidade */}
          <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Simultaneidade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Para qual tipo deseja cadastrar?</DialogTitle>
                <DialogDescription>
                  Escolha o tipo de simultaneidade que deseja cadastrar
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-4 mt-4">
                <Button 
                  onClick={() => openNewItemDialog('multi')}
                  className="flex-1"
                >
                  Multi Split
                </Button>
                <Button 
                  onClick={() => openNewItemDialog('vrf')}
                  className="flex-1"
                >
                  VRF
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabela */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (sortBy === 'nome') {
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('nome');
                      setSortDir('asc');
                    }
                  }}
                >
                  Código
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (sortBy === 'nome') {
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('nome');
                      setSortDir('asc');
                    }
                  }}
                >
                  Nome {sortBy === 'nome' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (sortBy === 'valor') {
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('valor');
                      setSortDir('asc');
                    }
                  }}
                >
                  Valor {sortBy === 'valor' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma simultaneidade cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.id}
                    </TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{formatValue(item.valor)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal de Edição/Criação */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Simultaneidade' : `Nova Simultaneidade - ${selectedType === 'multi' ? 'Multi Split' : 'VRF'}`}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Edite as informações da simultaneidade' : 'Preencha os dados da nova simultaneidade'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">
                  Valor {selectedType === 'vrf' && '(deve ser maior que zero)'}
                </Label>
                <Input
                  id="valor"
                  type="number"
                  step={selectedType === 'vrf' ? '0.01' : 'any'}
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingItem ? 'Salvar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SimultaneidadeTab;