import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Edit, Trash2, UserX, RotateCcw, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface UserData {
  id: string;
  nome_completo: string;
  usuario: string;
  departamento: string;
  perfil_acesso: 'assistente' | 'administrador';
  ativo: boolean;
  created_at: string;
}

const UsersTab = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    usuario: '',
    departamento: '',
    perfil_acesso: 'assistente' as 'assistente' | 'administrador',
    senha: ''
  });

  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          nome_completo: formData.nome_completo,
          departamento: formData.departamento,
          perfil_acesso: formData.perfil_acesso
        };
        
        if (formData.senha) {
          updateData.senha = formData.senha; // In production, hash this
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso"
        });
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert([{
            nome_completo: formData.nome_completo,
            usuario: formData.usuario,
            departamento: formData.departamento,
            perfil_acesso: formData.perfil_acesso,
            senha: formData.senha // In production, hash this
          }]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso"
        });
      }
      
      fetchUsers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar usuário",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (userData: UserData) => {
    setEditingUser(userData);
    setFormData({
      nome_completo: userData.nome_completo,
      usuario: userData.usuario,
      departamento: userData.departamento,
      perfil_acesso: userData.perfil_acesso,
      senha: ''
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ativo: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      fetchUsers();
      toast({
        title: "Sucesso",
        description: `Usuário ${!currentStatus ? 'ativado' : 'inativado'} com sucesso`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do usuário",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      fetchUsers();
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso"
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      usuario: '',
      departamento: '',
      perfil_acesso: 'assistente',
      senha: ''
    });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user =>
    user.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin()) {
    return (
      <Alert>
        <AlertDescription>
          Acesso negado. Apenas administradores podem gerenciar usuários.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Gerenciamento de Usuários
        </CardTitle>
        <CardDescription>
          Gerencie usuários, permissões e acessos do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Edite as informações do usuário' : 'Preencha os dados do novo usuário'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuário</Label>
                  <Input
                    id="usuario"
                    value={formData.usuario}
                    onChange={(e) => setFormData(prev => ({ ...prev, usuario: e.target.value }))}
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select value={formData.perfil_acesso} onValueChange={(value: 'assistente' | 'administrador') => 
                    setFormData(prev => ({ ...prev, perfil_acesso: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assistente">Assistente</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">
                    {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                    required={!editingUser}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingUser ? 'Salvar' : 'Criar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell className="font-medium">
                      {userData.nome_completo}
                    </TableCell>
                    <TableCell>{userData.usuario}</TableCell>
                    <TableCell>{userData.departamento}</TableCell>
                    <TableCell>
                      <Badge variant={userData.perfil_acesso === 'administrador' ? 'default' : 'secondary'}>
                        {userData.perfil_acesso}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.ativo ? 'default' : 'destructive'}>
                        {userData.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(userData)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(userData.id, userData.ativo)}
                        >
                          {userData.ativo ? <UserX className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(userData.id)}
                          disabled={userData.id === user?.id}
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
      </CardContent>
    </Card>
  );
};

export default UsersTab;