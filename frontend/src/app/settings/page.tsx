'use client';

import React, { useState, useEffect } from 'react';
import { api, User, Team } from '@/lib/api';
import { RefreshCw, Users, Shield, UserCheck, Plus, Settings } from 'lucide-react';

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Criar Equipe State
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');

  // Criar Usuário State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'vendedor' as 'admin' | 'gestor' | 'vendedor',
    team_id: ''
  });

  const loadData = async () => {
    setLoading(true);
    const [fetchedUsers, fetchedTeams] = await Promise.all([
      api.getUsers(),
      api.getTeams()
    ]);
    setUsers(fetchedUsers);
    setTeams(fetchedTeams);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    await api.createTeam(newTeamName, selectedManagerId || null);
    
    // Reset e recarrega
    setNewTeamName('');
    setSelectedManagerId('');
    setIsCreatingTeam(false);
    loadData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return;

    const payload = {
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      team_id: newUserForm.team_id === 'none' || !newUserForm.team_id ? null : newUserForm.team_id
    };

    const result = await api.createUser(payload);
    if (result) {
      setNewUserForm({
        name: '',
        email: '',
        role: 'vendedor',
        team_id: ''
      });
      setIsCreatingUser(false);
      loadData();
    } else {
      alert("Falha ao criar profissional. Certifique-se de que o e-mail comercial seja exclusivo.");
    }
  };

  const handleUpdateUserTeam = async (userId: string, teamId: string) => {
    const targetTeamId = teamId === 'none' ? null : teamId;
    await api.updateUserTeam(userId, targetTeamId);
    loadData();
  };

  // Helpers de Renderização
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center w-fit"><Shield className="mr-1" size={12} /> Admin</span>;
      case 'gestor':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center w-fit"><UserCheck className="mr-1" size={12} /> Gestor</span>;
      default:
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center w-fit"><Users className="mr-1" size={12} /> Vendedor</span>;
    }
  };

  const getTeamName = (teamId?: string | null) => {
    if (!teamId) return <span className="text-foreground/40 italic text-xs">Sem equipe vinculada</span>;
    const team = teams.find(t => t.id === teamId);
    return team ? <span className="text-sm font-semibold text-primary">{team.name}</span> : <span className="text-foreground/45 italic text-xs">Equipe desconhecida</span>;
  };

  const getManagerName = (managerId?: string | null) => {
    if (!managerId) return 'Sem Gestor';
    const manager = users.find(u => u.id === managerId);
    return manager ? manager.name : 'Gestor Desconhecido';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-3 text-foreground/50">
        <RefreshCw className="animate-spin" size={32} />
        <span>Buscando usuários e organograma comercial...</span>
      </div>
    );
  }

  // Filtrar usuários que podem ser gestores (Admin e Gestor)
  const potentialManagers = users.filter(u => u.role === 'admin' || u.role === 'gestor');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Equipes & Organograma</h2>
          <p className="text-foreground/60 mt-1">Gerencie a estrutura comercial da De Nigris, vendedores e gestores de forma fluida.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setIsCreatingUser(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/95 transition-colors">
            + Novo Profissional
          </button>
          <button onClick={loadData} className="bg-foreground/5 text-foreground px-4 py-2 rounded-md font-medium hover:bg-foreground/10 transition-colors flex items-center">
            <RefreshCw size={16} className="mr-2" /> Atualizar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna 1 e 2: Gerenciamento de Usuários */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Users className="mr-2 text-primary" size={20} /> Lista de Profissionais
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-foreground/50 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Nome / E-mail</th>
                    <th className="pb-3">Cargo</th>
                    <th className="pb-3">Equipe Vinculada</th>
                    <th className="pb-3 pr-2 text-right">Alterar Equipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-4 pl-2">
                        <div className="font-semibold text-sm">{user.name}</div>
                        <div className="text-xs text-foreground/50">{user.email}</div>
                      </td>
                      <td className="py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-4">
                        {getTeamName(user.team_id)}
                      </td>
                      <td className="py-4 pr-2 text-right">
                        {user.role === 'admin' ? (
                          <span className="text-xs text-foreground/30 italic">Acesso Geral</span>
                        ) : (
                          <select 
                            value={user.team_id || 'none'}
                            onChange={(e) => handleUpdateUserTeam(user.id, e.target.value)}
                            className="bg-background border border-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          >
                            <option value="none">Nenhuma (Sem Equipe)</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna 3: Gerenciamento de Equipes */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Settings className="mr-2 text-primary" size={20} /> Equipes comerciais
              </h3>
              {!isCreatingTeam && (
                <button 
                  onClick={() => setIsCreatingTeam(true)}
                  className="bg-primary text-primary-foreground p-1.5 rounded-full hover:bg-primary/95 transition-colors"
                  title="Criar Nova Equipe"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Formulário Novo Time */}
            {isCreatingTeam && (
              <form onSubmit={handleCreateTeam} className="bg-foreground/[0.03] border border-border p-4 rounded-lg space-y-3 mb-4 animate-in slide-in-from-top duration-200">
                <h4 className="text-xs font-bold uppercase text-foreground/60 tracking-wider">Nova Equipe Comercial</h4>
                <div>
                  <label className="text-[10px] font-semibold text-foreground/75 block mb-1">Nome da Equipe</label>
                  <input 
                    type="text" 
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Ex: Equipe Seminovos"
                    className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-foreground/75 block mb-1">Gestor Responsável</label>
                  <select 
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Sem Gestor Atribuído</option>
                    {potentialManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.role})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCreatingTeam(false)}
                    className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-primary-foreground px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Salvar Equipe
                  </button>
                </div>
              </form>
            )}

            {/* Lista Equipes */}
            <div className="space-y-3">
              {teams.length === 0 ? (
                <div className="text-center py-6 text-foreground/40 text-xs italic">Nenhuma equipe comercial cadastrada.</div>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="border border-border bg-background p-3 rounded-lg hover:border-foreground/20 transition-all flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground/90">{team.name}</span>
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">Ativa</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-foreground/50 border-t border-border/30 pt-2">
                      <span>Liderança:</span>
                      <span className="font-medium text-foreground/80">{getManagerName(team.manager_id)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal de Cadastro de Novo Profissional */}
      {isCreatingUser && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsCreatingUser(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-w-[95vw] bg-card border border-border rounded-xl shadow-2xl p-6 z-50 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold">Novo Profissional Comercial</h3>
              <button onClick={() => setIsCreatingUser(false)} className="text-foreground/40 hover:text-foreground text-sm p-1 rounded-full hover:bg-foreground/5">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Ex: Fabiano Fachini"
                  className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">E-mail Comercial *</label>
                <input 
                  type="email" 
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="exemplo@denigris.com.br"
                  className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Cargo / Função *</label>
                  <select 
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="gestor">Gestor de Equipe</option>
                    <option value="admin">Administrador / Diretor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Equipe Vinculada</label>
                  <select 
                    value={newUserForm.team_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, team_id: e.target.value })}
                    className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  >
                    <option value="none">Nenhuma (Sem Equipe)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm font-medium transition-colors"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
