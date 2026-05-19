'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, User, Team, LeadRoutingRule } from '@/lib/api';
import { RefreshCw, Shield, Plus, Edit, Trash2, Lock, Shuffle, Sliders, AlertOctagon, HelpCircle, ArrowRight, Ban, Check } from 'lucide-react';

export default function DistribuicaoPage() {
  const [rules, setRules] = useState<LeadRoutingRule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Criar Regra State
  const [isCreating, setIsCreating] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState<'block' | 'redirect'>('block');
  const [teamId, setTeamId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Editar Regra State
  const [editingRule, setEditingRule] = useState<LeadRoutingRule | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editAction, setEditAction] = useState<'block' | 'redirect'>('block');
  const [editTeamId, setEditTeamId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [fetchedRules, fetchedTeams] = await Promise.all([
        api.getRoutingRules(),
        api.getTeams()
      ]);
      setRules(fetchedRules);
      setTeams(fetchedTeams);
    } catch (err) {
      console.error("Erro ao carregar regras/equipes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setActiveUser(api.getCurrentUser());
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setSaveLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        keyword: keyword.trim(),
        action,
        team_id: action === 'redirect' && teamId ? teamId : null
      };

      const result = await api.createRoutingRule(payload);
      if (result) {
        setKeyword('');
        setAction('block');
        setTeamId('');
        setIsCreating(false);
        await loadData();
      } else {
        setErrorMsg('Falha ao criar regra. Verifique se a palavra-chave já está cadastrada.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao salvar a regra.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStartEdit = (rule: LeadRoutingRule) => {
    setEditingRule(rule);
    setEditKeyword(rule.keyword);
    setEditAction(rule.action);
    setEditTeamId(rule.team_id || '');
    setErrorMsg('');
  };

  const handleUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editKeyword.trim()) return;

    setSaveLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        keyword: editKeyword.trim(),
        action: editAction,
        team_id: editAction === 'redirect' && editTeamId ? editTeamId : null
      };

      const result = await api.updateRoutingRule(editingRule.id, payload);
      if (result) {
        setEditingRule(null);
        await loadData();
      } else {
        setErrorMsg('Falha ao atualizar regra. Verifique se a palavra-chave já existe.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao atualizar a regra.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra de distribuição comercial?")) return;

    try {
      const success = await api.deleteRoutingRule(ruleId);
      if (success) {
        await loadData();
      } else {
        alert("Falha ao excluir regra.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir a regra.");
    }
  };

  const getTeamName = (id: string | null) => {
    if (!id) return '';
    const team = teams.find(t => t.id === id);
    return team ? team.name : 'Equipe Desconhecida';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-3 text-foreground/50">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold tracking-wide font-mono">Buscando regras e permissões de distribuição...</span>
      </div>
    );
  }

  // Apenas Administrador/Diretor (role = admin) tem permissão de gerenciar regras
  if (activeUser && activeUser.role !== 'admin') {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] space-y-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 shadow-lg">
          <Lock size={32} />
        </div>
        <h3 className="text-xl font-bold tracking-tight">Acesso Restrito</h3>
        <p className="text-sm text-foreground/60">Seu perfil comercial não possui permissão para acessar o painel de distribuição por regras. Contate a diretoria caso necessário.</p>
        <Link href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors">
          Voltar para Agenda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Shuffle className="mr-3 text-primary shrink-0" size={28} /> Regras de Distribuição
          </h2>
          <p className="text-foreground/60 mt-1">Gerencie filtros de palavras-chave para redirecionar ou bloquear a entrada automática de Leads.</p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <button 
            onClick={() => setIsCreating(true)} 
            className="bg-primary text-primary-foreground px-4.5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 flex items-center cursor-pointer border border-primary-foreground/5"
          >
            <Plus size={16} className="mr-1.5" /> Nova Regra
          </button>
          <button 
            onClick={loadData} 
            className="bg-card border border-border/80 hover:bg-foreground/5 text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center cursor-pointer"
          >
            <RefreshCw size={14} className="mr-2" /> Atualizar
          </button>
        </div>
      </header>

      {/* Grid Informativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card/45 border border-border/40 p-4 rounded-xl backdrop-blur-sm flex items-start space-x-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Sliders size={18} />
          </div>
          <div>
            <h4 className="text-xs uppercase font-bold text-foreground/50 tracking-wider">Filtro Inteligente</h4>
            <p className="text-xs text-foreground/60 mt-1">A varredura analisa o e-mail completo (assunto, corpo) e a análise da IA de forma flexível (ignorando acentos e maiúsculas).</p>
          </div>
        </div>

        <div className="bg-card/45 border border-border/40 p-4 rounded-xl backdrop-blur-sm flex items-start space-x-3">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
            <Ban size={18} />
          </div>
          <div>
            <h4 className="text-xs uppercase font-bold text-foreground/50 tracking-wider">Bloqueio Automático</h4>
            <p className="text-xs text-foreground/60 mt-1">Fórmulas como "trabalhe conosco" ou lixo eletrônico podem ser bloqueados de forma que nem cheguem à caixa dos vendedores.</p>
          </div>
        </div>

        <div className="bg-card/45 border border-border/40 p-4 rounded-xl backdrop-blur-sm flex items-start space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Shuffle size={18} />
          </div>
          <div>
            <h4 className="text-xs uppercase font-bold text-foreground/50 tracking-wider">Direcionamento Exclusivo</h4>
            <p className="text-xs text-foreground/60 mt-1">Redirecione produtos de alto valor ou nichos específicos para equipes dedicadas no rodízio de leads.</p>
          </div>
        </div>
      </div>

      {/* Tabela de Regras */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Sliders className="mr-2 text-primary" size={20} /> Regras Cadastradas ({rules.length})
        </h3>
        
        {rules.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <AlertOctagon className="mx-auto text-foreground/30" size={40} />
            <div className="text-foreground/50 font-medium text-sm italic">Nenhuma regra de distribuição cadastrada.</div>
            <p className="text-xs text-foreground/40 max-w-sm mx-auto">Clique em "+ Nova Regra" acima para configurar o roteamento por palavras-chave.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-foreground/50 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Palavra-chave / Termo de Busca</th>
                  <th className="pb-3">Comportamento / Ação</th>
                  <th className="pb-3">Destinatário</th>
                  <th className="pb-3">Data de Criação</th>
                  <th className="pb-3 pr-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-foreground/[0.01] transition-colors">
                    <td className="py-4 pl-2 font-mono text-sm font-semibold text-foreground/90">
                      "{rule.keyword}"
                    </td>
                    <td className="py-4">
                      {rule.action === 'block' ? (
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center">
                          <Ban size={12} className="mr-1" /> Bloquear Entrada
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center">
                          <ArrowRight size={12} className="mr-1" /> Redirecionar
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-sm font-medium">
                      {rule.action === 'redirect' ? (
                        <span className="text-primary font-semibold">{getTeamName(rule.team_id)}</span>
                      ) : (
                        <span className="text-foreground/35 italic text-xs">Ninguém (Lead Descartado)</span>
                      )}
                    </td>
                    <td className="py-4 text-xs text-foreground/50 font-medium">
                      {new Date(rule.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className="p-2 text-foreground/60 hover:text-primary hover:bg-foreground/5 rounded-lg transition-colors cursor-pointer"
                          title="Editar Regra"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 text-foreground/60 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Regra"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação de Regra */}
      {isCreating && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsCreating(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-w-[95vw] bg-card border border-border rounded-xl shadow-2xl p-6 z-50 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center">
                <Shuffle size={18} className="mr-2 text-primary" /> Nova Regra de Distribuição
              </h3>
              <button 
                onClick={() => setIsCreating(false)} 
                className="text-foreground/40 hover:text-foreground text-sm p-1 rounded-full hover:bg-foreground/5 cursor-pointer bg-transparent border-none"
              >
                ✕
              </button>
            </div>
            
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center space-x-2 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Palavra-chave ou Termo *</label>
                <input 
                  type="text" 
                  required
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex: trabalhe conosco, faturamento direto, etc."
                  className="w-full bg-background border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                />
                <p className="text-[10px] text-foreground/45 mt-1 leading-normal">O sistema buscará por correspondência exata ou parcial dessa frase nos e-mails recebidos.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-2">Ação Desejada *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAction('block');
                      setTeamId('');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      action === 'block'
                        ? 'border-red-500/50 bg-red-500/10 text-red-500 shadow-sm'
                        : 'border-border/60 bg-transparent text-foreground/60 hover:bg-foreground/5'
                    }`}
                  >
                    <Ban size={16} />
                    <span>Bloquear Entrada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('redirect')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      action === 'redirect'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-sm'
                        : 'border-border/60 bg-transparent text-foreground/60 hover:bg-foreground/5'
                    }`}
                  >
                    <ArrowRight size={16} />
                    <span>Redirecionar Equipe</span>
                  </button>
                </div>
              </div>

              {action === 'redirect' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Equipe Destinatária *</label>
                  <select 
                    required
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                  >
                    <option value="">Selecione a equipe de rodízio</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-foreground/45 mt-1 leading-normal">O lead correspondente será atribuído via rodízio justo exclusivamente para os membros desta equipe comercial.</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-border/20"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold transition-colors flex items-center cursor-pointer"
                >
                  {saveLoading && <RefreshCw className="animate-spin mr-1.5" size={12} />}
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal de Edição de Regra */}
      {editingRule && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setEditingRule(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-w-[95vw] bg-card border border-border rounded-xl shadow-2xl p-6 z-50 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center">
                <Edit size={18} className="mr-2 text-primary" /> Editar Regra de Distribuição
              </h3>
              <button 
                onClick={() => setEditingRule(null)} 
                className="text-foreground/40 hover:text-foreground text-sm p-1 rounded-full hover:bg-foreground/5 cursor-pointer bg-transparent border-none"
              >
                ✕
              </button>
            </div>
            
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center space-x-2 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleUpdateRule} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Palavra-chave ou Termo *</label>
                <input 
                  type="text" 
                  required
                  value={editKeyword}
                  onChange={(e) => setEditKeyword(e.target.value)}
                  placeholder="Ex: trabalhe conosco, faturamento direto, etc."
                  className="w-full bg-background border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-2">Ação Desejada *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditAction('block');
                      setEditTeamId('');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editAction === 'block'
                        ? 'border-red-500/50 bg-red-500/10 text-red-500 shadow-sm'
                        : 'border-border/60 bg-transparent text-foreground/60 hover:bg-foreground/5'
                    }`}
                  >
                    <Ban size={16} />
                    <span>Bloquear Entrada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAction('redirect')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editAction === 'redirect'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-sm'
                        : 'border-border/60 bg-transparent text-foreground/60 hover:bg-foreground/5'
                    }`}
                  >
                    <ArrowRight size={16} />
                    <span>Redirecionar Equipe</span>
                  </button>
                </div>
              </div>

              {editAction === 'redirect' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Equipe Destinatária *</label>
                  <select 
                    required
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                  >
                    <option value="">Selecione a equipe de rodízio</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-border/20"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold transition-colors flex items-center cursor-pointer"
                >
                  {saveLoading && <RefreshCw className="animate-spin mr-1.5" size={12} />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
