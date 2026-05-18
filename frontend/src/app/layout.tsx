'use client';

import './globals.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Terminal, Kanban, Calendar, Shield, User, RefreshCw, UserCheck } from 'lucide-react';
import { api, User as UserType } from '@/lib/api';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [users, setUsers] = useState<UserType[]>([]);
  const [activeUser, setActiveUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar os usuários do backend
  const loadUsersAndActiveSession = async () => {
    try {
      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);

      // Tentar obter usuário ativo da sessão local
      const savedUser = api.getCurrentUser();
      
      if (savedUser && fetchedUsers.some(u => u.id === savedUser.id)) {
        // Garantir que os dados do usuário salvo estejam atualizados (por exemplo, is_paused)
        const updatedSavedUser = fetchedUsers.find(u => u.id === savedUser.id);
        if (updatedSavedUser) {
          setActiveUser(updatedSavedUser);
          api.setCurrentUser(updatedSavedUser);
        } else {
          setActiveUser(savedUser);
        }
      } else if (fetchedUsers.length > 0) {
        // Default: Selecionar o primeiro admin ou o primeiro vendedor da lista
        const firstAdmin = fetchedUsers.find(u => u.role === 'admin') || fetchedUsers[0];
        setActiveUser(firstAdmin);
        api.setCurrentUser(firstAdmin);
      }
    } catch (err) {
      console.error("Falha ao carregar sessão comercial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndActiveSession();
  }, []);

  const handleSwitchUser = (userId: string) => {
    const selected = users.find(u => u.id === userId);
    if (selected) {
      setActiveUser(selected);
      api.setCurrentUser(selected);
      // Recarregar a página para limpar todos os estados locais e re-filtrar Leads instantaneamente
      window.location.reload();
    }
  };

  // Regras de Visualização baseadas em Perfil (Acesso de Acesso)
  const isVendedor = activeUser?.role === 'vendedor';
  const isGestor = activeUser?.role === 'gestor';
  const isAdmin = activeUser?.role === 'admin';

  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background text-foreground antialiased">
        <div className="flex h-screen overflow-hidden">
          
          {/* Menu Lateral Fixo */}
          <aside className="w-64 border-r border-border bg-card flex flex-col p-4 shrink-0 justify-between select-none">
            <div className="space-y-6">
              <div className="flex items-center space-x-2.5 px-3 py-1">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground shadow">DN</div>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text">De Nigris CRM</h1>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8 text-foreground/40 text-xs">
                  <RefreshCw className="animate-spin mr-2" size={14} /> Carregando permissões...
                </div>
              ) : (
                <nav className="space-y-1">
                  {/* Link: Agenda / Hoje (Disponível para todos os perfis) */}
                  <Link 
                    href="/" 
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      pathname === '/' 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                    }`}
                  >
                    <Calendar size={18} />
                    <span>Agenda / Hoje</span>
                  </Link>

                  {/* Link: Kanban (Disponível para todos os perfis) */}
                  <Link 
                    href="/kanban" 
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      pathname === '/kanban' 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                    }`}
                  >
                    <Kanban size={18} />
                    <span>Kanban</span>
                  </Link>

                  {/* Link: Equipes & Usuários (Indisponível para Vendedor) */}
                  {(isAdmin || isGestor) && (
                    <Link 
                      href="/settings" 
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        pathname === '/settings' 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                      }`}
                    >
                      <Users size={18} />
                      <span>Equipes & Usuários</span>
                    </Link>
                  )}

                  {/* Link: Logs Comerciais (Apenas Admin/Diretoria) */}
                  {isAdmin && (
                    <Link 
                      href="/logs" 
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        pathname === '/logs' 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                      }`}
                    >
                      <Terminal size={18} />
                      <span>Logs Comerciais</span>
                    </Link>
                  )}
                </nav>
              )}
            </div>

            {/* Seletor Dinâmico de Usuários (Login Simulado) */}
            <div className="border-t border-border/60 pt-4 mt-auto space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-foreground/45 tracking-wider block pl-1">
                  Usuário Ativo (Sessão)
                </label>
                {loading ? (
                  <div className="h-9 w-full bg-foreground/5 rounded animate-pulse" />
                ) : (
                  <select
                    value={activeUser?.id || ''}
                    onChange={(e) => handleSwitchUser(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:bg-background transition-colors text-foreground/85"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'admin' ? 'Diretor' : u.role === 'gestor' ? 'Gestor' : 'Vendedor'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {activeUser && (
                <div className="flex items-center justify-between pl-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">
                      Perfil de Acesso
                    </span>
                    <span className="text-xs font-semibold text-primary flex items-center mt-0.5">
                      {activeUser.role === 'admin' && <Shield className="inline mr-1" size={12} />}
                      {activeUser.role === 'gestor' && <UserCheck className="inline mr-1" size={12} />}
                      {activeUser.role === 'vendedor' && <User className="inline mr-1" size={12} />}
                      {activeUser.role === 'admin' ? 'Acesso Geral' : activeUser.role === 'gestor' ? 'Gestão' : 'Vendedor'}
                    </span>
                  </div>
                  <div 
                    className={`w-2.5 h-2.5 rounded-full ${
                      activeUser.role === 'vendedor' && activeUser.is_paused 
                        ? 'bg-amber-500 animate-pulse' 
                        : 'bg-emerald-500 animate-pulse'
                    }`} 
                    title={
                      activeUser.role === 'vendedor' && activeUser.is_paused 
                        ? "Rodízio Pausado" 
                        : "Servidor Ativo"
                    } 
                  />
                </div>
              )}
            </div>

          </aside>

          {/* Área Principal */}
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
