'use client';

import './globals.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Terminal, Kanban, Calendar, Shield, User, RefreshCw, UserCheck, Lock, Mail, Key, LogOut, Eye, EyeOff } from 'lucide-react';
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

  // Estados do formulário de Login Real
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Carregar os usuários do backend e validar a sessão atual
  const loadSession = async () => {
    try {
      const savedUser = api.getCurrentUser();
      
      if (savedUser) {
        // Se houver usuário na sessão, buscamos a lista de usuários atualizada
        const fetchedUsers = await api.getUsers();
        setUsers(fetchedUsers);
        
        const updatedSavedUser = fetchedUsers.find(u => u.id === savedUser.id);
        if (updatedSavedUser) {
          setActiveUser(updatedSavedUser);
          api.setCurrentUser(updatedSavedUser);
        } else {
          setActiveUser(savedUser);
        }
      } else {
        // Se não houver sessão ativa, forçamos o estado nulo para exibir a tela de login
        setActiveUser(null);
      }
    } catch (err) {
      console.error("Falha ao carregar sessão comercial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Por favor, preencha todos os campos.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const loggedUser = await api.login(loginEmail.trim(), loginPassword.trim());
      if (loggedUser) {
        setActiveUser(loggedUser);
        // Após logar com sucesso, carrega a lista de usuários (para o simulador administrativo)
        const fetchedUsers = await api.getUsers();
        setUsers(fetchedUsers);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    await api.forgotPassword(forgotEmail.trim());
    setForgotLoading(false);
    setForgotSent(true);
  };

  const handleLogout = () => {
    api.setCurrentUser(null);
    setActiveUser(null);
    window.location.reload();
  };

  const handleSwitchUser = (userId: string) => {
    const selected = users.find(u => u.id === userId);
    if (selected) {
      setActiveUser(selected);
      api.setCurrentUser(selected);
      // Recarregar a página para limpar todos os estados locais e re-filtrar Leads instantaneamente
      window.location.reload();
    }
  };

  // Regras de Visualização baseadas em Perfil (Acesso de Segurança)
  const isVendedor = activeUser?.role === 'vendedor';
  const isGestor = activeUser?.role === 'gestor';
  const isAdmin = activeUser?.role === 'admin';

  // Se o sistema estiver carregando a sessão inicial
  if (loading) {
    return (
      <html lang="pt-BR" className="dark">
        <body className="bg-background text-foreground antialiased flex flex-col justify-center items-center h-screen space-y-4">
          <RefreshCw className="animate-spin text-primary" size={36} />
          <span className="text-sm font-semibold tracking-wide text-foreground/60 font-mono">Autenticando portal comercial...</span>
        </body>
      </html>
    );
  }

  // SE NÃO HOUVER SESSÃO ATIVA -> EXIBE A TELA DE LOGIN REAL COM BRANDING LUXUOSO
  if (!activeUser) {
    return (
      <html lang="pt-BR" className="dark">
        <body className="bg-[#040914] text-foreground antialiased flex items-center justify-center min-h-screen p-4 overflow-hidden relative">
          
          {/* Fundo Decorativo Premium (Branding De Nigris & Mercedes-Benz) */}
          <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[25rem] h-[25rem] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="w-full max-w-md bg-card/45 border border-border/40 backdrop-blur-xl p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-8 relative">
            
            {/* Logos Corporativos Premium (SVG Inline de Alta Fidelidade) */}
            <div className="flex justify-center items-center space-x-6 pb-2">
              {/* Logo De Nigris (Recriado com fidelidade absoluta de vetor e gradiente de luxo) */}
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 200 200" className="w-14 h-14 drop-shadow-[0_4px_12px_rgba(46,74,158,0.25)]" fill="none">
                  <rect width="200" height="200" rx="48" fill="url(#denigrisGrad)" />
                  <path d="M55 50 H95 C130 50 150 70 150 100 C150 130 130 150 95 150 H55 V50 Z" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M55 80 H80 V120 H55 V80 Z" fill="#2E4A9E" rx="8" />
                  <defs>
                    <linearGradient id="denigrisGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0B1C3F"/>
                      <stop stopColor="#070E1C"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-[9px] uppercase font-bold text-foreground/45 tracking-widest mt-2">De Nigris</span>
              </div>

              {/* Divisor Metálico */}
              <div className="h-10 w-px bg-border/45" />

              {/* Logo Mercedes-Benz (Estrela de 3 Pontas 2D Plana Branca) */}
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 512 512" className="w-14 h-14 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" fill="currentColor">
                  <circle cx="256" cy="256" r="236" fill="none" stroke="currentColor" strokeWidth="12"/>
                  <path d="M256 32 L242 232 L68 333 L256 266 L444 333 L270 232 Z" />
                </svg>
                <span className="text-[9px] uppercase font-bold text-foreground/45 tracking-widest mt-2">Mercedes-Benz</span>
              </div>
            </div>

            {/* Cabeçalho */}
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text">Portal de Leads De Nigris</h2>
              <p className="text-xs text-foreground/60 leading-relaxed max-w-[280px] mx-auto">Insira seu e-mail e senha comercial cadastrados para acessar o console.</p>
            </div>

            {/* Formulário de Login */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center space-x-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p>{loginError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider pl-1 flex items-center">
                  <Mail className="inline mr-1" size={10} /> E-mail Comercial
                </label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="exemplo@denigris.com.br"
                  required
                  className="w-full bg-[#080E1C] border border-border/40 focus:border-primary/60 rounded-xl px-4.5 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-foreground transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider flex items-center">
                    <Key className="inline mr-1" size={10} /> Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] text-foreground/35 font-medium hover:text-primary transition-colors cursor-pointer bg-transparent border-none outline-none"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-[#080E1C] border border-border/40 focus:border-primary/60 rounded-xl pl-4.5 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-foreground transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/45 hover:text-foreground/85 transition-colors p-1 bg-transparent border-none outline-none cursor-pointer"
                    title={showPassword ? "Ocultar Senha" : "Mostrar Senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loginLoading}
                className="w-full bg-primary text-primary-foreground font-semibold text-sm py-3 rounded-xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/15 flex justify-center items-center cursor-pointer border border-primary-foreground/5"
              >
                {loginLoading ? (
                  <RefreshCw className="animate-spin mr-2" size={16} />
                ) : (
                  <Lock className="mr-2" size={15} />
                )}
                {loginLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              </button>
            </form>

            {/* Rodapé Informativo */}
            <div className="text-center pt-2">
              <span className="text-[10px] text-foreground/30 font-medium">
                © {new Date().getFullYear()} Grupo De Nigris Ltda. Todos os direitos reservados.
              </span>
            </div>
          </div>

          {/* Modal Esqueceu a Senha */}
          {showForgotModal && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-[#0e1726] border border-border/55 p-6 rounded-2xl max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center space-x-3 text-primary">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Lock size={20} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-white">Esqueceu sua senha?</h3>
                </div>
                
                {forgotSent ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                      <p className="text-sm text-emerald-400 font-medium">Link enviado com sucesso!</p>
                      <p className="text-xs text-slate-300 mt-2">Verifique sua caixa de entrada e a pasta de spam. O link é válido por 1 hora.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setForgotSent(false);
                        setForgotEmail('');
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer border border-border/40 outline-none"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed text-center px-2">
                      Digite seu e-mail corporativo abaixo. Você receberá um link seguro para redefinir sua senha.
                    </p>
                    
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <input 
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu.email@denigris.com.br"
                        className="w-full bg-[#080e1c]/80 border border-border/40 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-sm"
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="flex-1 bg-transparent hover:bg-white/5 text-slate-300 font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer border border-border/40 outline-none"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer border-none outline-none shadow-lg shadow-primary/20"
                      >
                        {forgotLoading ? 'Enviando...' : 'Enviar Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </body>
      </html>
    );
  }

  // SE ESTIVER AUTENTICADO -> CARREGA A ÁREA INTERNA DO CRM
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background text-foreground antialiased">
        <div className="flex h-screen overflow-hidden">
          
          {/* Menu Lateral Fixo */}
          <aside className="w-64 border-r border-border bg-card flex flex-col p-4 shrink-0 justify-between select-none">
            <div className="space-y-6">
              
              {/* Branding da Empresa no Topo */}
              <div className="flex items-center space-x-3 px-3 py-1">
                {/* Ícone de D e N em SVG Premium */}
                <svg viewBox="0 0 200 200" className="w-8 h-8 rounded-lg shadow" fill="none">
                  <rect width="200" height="200" rx="48" fill="url(#denigrisGradSmall)" />
                  <path d="M55 50 H95 C130 50 150 70 150 100 C150 130 130 150 95 150 H55 V50 Z" stroke="white" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M55 80 H80 V120 H55 V80 Z" fill="#2E4A9E" rx="8" />
                  <defs>
                    <linearGradient id="denigrisGradSmall" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0B1C3F"/>
                      <stop stopColor="#070E1C"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold tracking-tight leading-none text-foreground">De Nigris CRM</h1>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/45 mt-0.5">Mercedes-Benz</span>
                </div>
              </div>

              {/* Navegação por Perfil */}
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
            </div>

            {/* Painel do Usuário Logado & Simulador Administrativo */}
            <div className="border-t border-border/60 pt-4 mt-auto space-y-4">
              
              {/* Simulador de Perfis (Disponível apenas para Administradores da Diretoria) */}
              {isAdmin && users.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-foreground/45 tracking-wider block pl-1">
                    Simulador de Perfis (Auditoria)
                  </label>
                  <select
                    value={activeUser.id}
                    onChange={(e) => handleSwitchUser(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:bg-background transition-colors text-foreground/85"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'admin' ? 'Diretor' : u.role === 'gestor' ? 'Gestor' : 'Vendedor'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Informações da Sessão Ativa */}
              <div className="flex items-center justify-between pl-1 bg-foreground/[0.02] p-2 rounded-lg border border-border/40">
                <div className="flex flex-col">
                  <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider leading-none">
                    Perfil
                  </span>
                  <span className="text-xs font-semibold text-primary flex items-center mt-1">
                    {activeUser.role === 'admin' && <Shield className="inline mr-1 text-slate-400" size={11} />}
                    {activeUser.role === 'gestor' && <UserCheck className="inline mr-1" size={11} />}
                    {activeUser.role === 'vendedor' && <User className="inline mr-1" size={11} />}
                    {activeUser.role === 'admin' ? 'Diretor' : activeUser.role === 'gestor' ? 'Gestor' : 'Vendedor'}
                  </span>
                  <span className="text-[10px] text-foreground/60 mt-0.5 max-w-[120px] truncate font-medium">
                    {activeUser.name}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      activeUser.role === 'vendedor' && activeUser.is_paused 
                        ? 'bg-amber-500 animate-pulse' 
                        : 'bg-emerald-500 animate-pulse'
                    }`} 
                    title={
                      activeUser.role === 'vendedor' && activeUser.is_paused 
                        ? "Rodízio de Leads Pausado" 
                        : "Vendedor no Rodízio de Leads"
                    } 
                  />
                  <button
                    onClick={handleLogout}
                    className="text-foreground/45 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-all"
                    title="Encerrar Sessão"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>

            </div>

          </aside>

          {/* Área Principal de Conteúdo das Páginas */}
          <main className="flex-1 overflow-y-auto p-6 bg-background relative">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
