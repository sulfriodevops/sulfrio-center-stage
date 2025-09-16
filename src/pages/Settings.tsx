import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersTab from '@/components/settings/UsersTab';
import SimultaneidadeTab from '@/components/settings/SimultaneidadeTab';

const Settings = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>
      
      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="simultaneidade">Cadastro de Simultaneidade</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usuarios" className="mt-6">
          <UsersTab />
        </TabsContent>
        
        <TabsContent value="simultaneidade" className="mt-6">
          <SimultaneidadeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;