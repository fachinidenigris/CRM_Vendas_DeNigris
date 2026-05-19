'use client';
import React, { useEffect, useState } from 'react';
import { 
  MoreVertical, Clock, MessageSquare, Briefcase, RefreshCw, Calendar, 
  Tag, User as UserIcon, Info, X, Check, AlertCircle 
} from 'lucide-react';
import { api, Lead, User as UserType } from '@/lib/api';
import { LeadDrawer } from './LeadDrawer';

const COLUMNS = [
  { id: 'novo', title: 'Leads Novos', color: 'border-indigo-500', bg: 'bg-indigo-500/5', help: 'Leads recém-chegados que ainda não foram atendidos.' },
  { id: 'qualificacao', title: 'Qualificação', color: 'border-blue-500', bg: 'bg-blue-500/5', help: 'Fase de sondagem: descobrir necessidade, capacidade financeira e timing.' },
  { id: 'distribuido', title: 'Distribuído', color: 'border-yellow-500', bg: 'bg-yellow-500/5', help: 'Lead atribuído e em negociação ativa com vendedor.' },
  { id: 'venda_realizada', title: 'Venda Realizada', color: 'border-emerald-500', bg: 'bg-emerald-500/5', help: 'Negócio fechado com sucesso.' },
  { id: 'venda_perdida', title: 'Venda Perdida', color: 'border-red-500', bg: 'bg-red-500/5', help: 'Negociação encerrada sem fechamento.' },
];

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [outcomeModal, setOutcomeModal] = useState<{ isOpen: boolean, type: 'venda_realizada' | 'venda_perdida' | null, leadId: string | null }>({ isOpen: false, type: null, leadId: null });
  const [activeMenuLeadId, setActiveMenuLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHelpColId, setActiveHelpColId] = useState<string | null>(null);
  
  // Custom Toast System (UX Mobile-First)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  // Estados para os Forms dos Modais
  const [outcomeForm, setOutcomeForm] = useState<any>({});

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await api.getLeads();
      const usersData = await api.getUsers();
      setUsers(usersData);
      
      const activeUser = api.getCurrentUser();
      let filtered = data;
      
      if (activeUser && activeUser.role === 'vendedor') {
        filtered = data.filter(l => l.assigned_to_id === activeUser.id);
      }
      
      // Auto-Arquivamento (oculta da tela se is_archived for true)
      filtered = filtered.filter(l => !l.is_archived);
      
      setLeads(filtered);
    } catch (err) {
      console.error(err);
      addToast('error', 'Erro de Sincronização', 'Não foi possível carregar os dados comerciais do servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    // Intercepta arraste para colunas de fechamento
    if (targetStatus === 'venda_realizada' || targetStatus === 'venda_perdida') {
      setOutcomeForm({}); // Reseta o form
      setOutcomeModal({ isOpen: true, type: targetStatus as 'venda_realizada' | 'venda_perdida', leadId });
      return;
    }

    // Atualiza status localmente primeiro para resposta instantânea na tela
    const originalLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));

    // Salva no banco de dados
    const updated = await api.updateLeadStatus(leadId, targetStatus);
    if (!updated) {
      setLeads(originalLeads);
      addToast('error', 'Falha na Transição', 'Não foi possível salvar o novo status do lead no banco de dados.');
    } else {
      addToast('success', 'Fase Atualizada', 'O lead foi movido com sucesso no funil comercial.');
      fetchLeads();
    }
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeModal.leadId || !outcomeModal.type) return;
    setLoading(true);
    
    const updateData = {
        ...outcomeForm,
        status: outcomeModal.type
    };
    
    // Tratamento numérico para valor da venda
    if (updateData.sale_value) {
      updateData.sale_value = parseFloat(updateData.sale_value.toString().replace(/[^0-9.-]+/g,""));
    }
    
    const success = await api.updateLead(outcomeModal.leadId, updateData);
    if (success) {
      setOutcomeModal({ isOpen: false, type: null, leadId: null });
      addToast('success', 'Negócio Concluído', outcomeModal.type === 'venda_realizada' ? 'Parabéns! Venda registrada com sucesso.' : 'Lead arquivado como venda perdida.');
      fetchLeads();
    } else {
      setLoading(false);
      addToast('error', 'Erro de Gravação', 'Não foi possível registrar o fechamento do lead.');
    }
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-[500px] space-x-2 text-foreground/50">
        <RefreshCw className="animate-spin text-primary" size={24} />
        <span className="font-medium text-sm">Carregando leads comerciais...</span>
      </div>
    );
  }

  // Helper para colorir as categorias comerciais
  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'Veículos Novos': return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/25';
      case 'Veículos Usados': return 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/25';
      case 'Locação': return 'bg-orange-500/10 text-orange-500 border border-orange-500/25';
      case 'Produtos Agregados': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25';
      default: return 'bg-foreground/5 text-foreground/60 border border-foreground/10';
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(q)) ||
      (lead.email && lead.email.toLowerCase().includes(q)) ||
      (lead.phone && lead.phone.toLowerCase().includes(q)) ||
      (lead.company && lead.company.toLowerCase().includes(q)) ||
      (lead.product_interest && lead.product_interest.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full space-y-4 relative w-full">
      {/* Barra de Busca Global */}
      <div className="flex items-center bg-card border border-border px-4 py-2 rounded-xl shadow-sm max-w-md w-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-foreground/45 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, e-mail, celular, veículo..."
          className="w-full bg-transparent text-xs text-foreground outline-none placeholder-foreground/45 font-semibold"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-foreground/45 hover:text-foreground p-0.5 rounded-full hover:bg-foreground/5 transition-all text-xs"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-1 h-[calc(100vh-250px)] min-h-[450px] space-x-4 overflow-x-auto pb-6 select-none relative">
        {COLUMNS.map((col) => {
          const colLeads = filteredLeads.filter(l => l.status === col.id);
          const isOver = dragOverColumn === col.id;
          
          return (
            <div 
              key={col.id} 
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragLeave={() => setDragOverColumn(null)}
              className={`flex flex-col min-w-[300px] w-[300px] h-full rounded-xl border transition-all duration-200 ${
                isOver ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-foreground/5'
              }`}
            >
              {/* Header da Coluna */}
              <div className={`p-4 border-t-4 ${col.color} bg-card rounded-t-xl border-b border-border flex justify-between items-center shadow-sm`}>
                <div className="flex items-center space-x-2 relative">
                  <h3 className="font-semibold text-sm text-foreground/90">{col.title}</h3>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHelpColId(activeHelpColId === col.id ? null : col.id);
                    }}
                    className="flex items-center text-foreground/30 hover:text-primary transition-colors cursor-pointer"
                    title="Ver informações da etapa"
                  >
                    <Info size={14} />
                  </button>

                  {activeHelpColId === col.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveHelpColId(null)} />
                      <div className="absolute left-0 mt-6 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-bold text-[10px] uppercase text-primary tracking-wider">Sobre esta etapa</span>
                          <button onClick={() => setActiveHelpColId(null)} className="text-foreground/45 hover:text-foreground text-[10px]">✕</button>
                        </div>
                        <p className="leading-relaxed font-medium">{col.help}</p>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-xs text-foreground/50 font-normal">
                  {colLeads.length}
                </span>
              </div>

            {/* Área de Cards (rolagem vertical interna independente) */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {colLeads.map((lead) => {
                const leadTags = lead.tags ? lead.tags.split(',') : [];
                return (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => openLeadDetails(lead)}
                    className="bg-card border border-border p-3 rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 active:border-primary transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-border group-hover:bg-primary transition-colors shrink-0"></div>
                    
                    <div className="flex justify-between items-start mb-1 pl-2">
                      <div className="flex items-center space-x-2 max-w-[85%]">
                        {/* Removido prioridade e origem */}
                      </div>

                      {/* Botão de Transição Touch / Mobile-Friendly */}
                      <div className="relative shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Evita abrir o drawer do lead
                            setActiveMenuLeadId(activeMenuLeadId === lead.id ? null : lead.id);
                          }}
                          className="p-1 hover:bg-foreground/5 rounded-full transition-all text-foreground/30 hover:text-foreground cursor-pointer"
                          title="Alterar fase do lead"
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {activeMenuLeadId === lead.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setActiveMenuLeadId(null); }} />
                            <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl p-1 z-30 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="px-2.5 py-1.5 border-b border-border/60 text-[9px] font-bold uppercase text-foreground/40 tracking-wider">
                                Mudar para Etapa
                              </div>
                              <div className="py-1">
                                {COLUMNS.map((phase) => (
                                  <button
                                    key={phase.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setActiveMenuLeadId(null);
                                      if (phase.id === lead.status) return;
                                      
                                      // Intercepta para colunas de fechamento
                                      if (phase.id === 'venda_realizada' || phase.id === 'venda_perdida') {
                                        setOutcomeForm({});
                                        setOutcomeModal({ isOpen: true, type: phase.id, leadId: lead.id });
                                        return;
                                      }
                                      
                                      const originalLeads = [...leads];
                                      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: phase.id } : l));
                                      
                                      const updated = await api.updateLeadStatus(lead.id, phase.id);
                                      if (!updated) {
                                        setLeads(originalLeads);
                                        addToast('error', 'Falha na Transição', `Não foi possível mover o lead para a fase ${phase.title}`);
                                      } else {
                                        addToast('success', 'Fase Atualizada', `Lead "${lead.name}" movido para ${phase.title}`);
                                        fetchLeads();
                                      }
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors ${
                                      lead.status === phase.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-foreground/5 text-foreground/75 hover:text-foreground'
                                    }`}
                                  >
                                    {phase.title}
                                    {lead.status === phase.id && <Check size={12} className="text-primary" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="pl-2">
                      <h4 className="font-bold text-xs text-foreground/90 group-hover:text-primary transition-colors truncate" title={lead.name}>
                        {lead.name}
                      </h4>
                      
                      <p className="text-[11px] text-foreground/60 mt-1 flex items-center truncate" title={lead.company || lead.source}>
                        <Briefcase size={12} className="mr-1 shrink-0 text-foreground/40" /> {lead.company || 'Pessoa Física'}
                      </p>

                      <p className="text-[11px] text-foreground/60 mt-0.5 flex items-center font-semibold truncate text-primary" title={lead.product_interest || ''}>
                        <Tag size={12} className="mr-1 shrink-0 text-primary/70" /> {lead.product_interest || 'Sem veículo de interesse'}
                      </p>

                      {/* Rodapé do Card */}
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-border">
                        <div className="flex items-center space-x-1" title="Vendedor Atribuído">
                          <UserIcon size={12} className="text-foreground/40" />
                          <span className="text-[10px] text-foreground/60 font-medium truncate max-w-[120px]">
                            {lead.assigned_to_id ? (users.find(u => u.id === lead.assigned_to_id)?.name || 'Desconhecido') : 'Sem vendedor'}
                          </span>
                        </div>
                        <div className="flex text-foreground/40 items-center space-x-1 text-[10px]" title="Tempo sem atualização">
                          <Clock size={11} />
                          <span>
                            {(() => {
                              const updatedAt = lead.updated_at || lead.created_at || new Date().toISOString();
                              const diffDays = Math.floor((new Date().getTime() - new Date(updatedAt).getTime()) / (1000 * 3600 * 24));
                              return diffDays <= 0 ? 'Hoje' : `${diffDays} d atrás`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {colLeads.length === 0 && (
                <div className="text-center p-8 text-xs text-foreground/40 border border-dashed border-border bg-card/40 rounded-xl">
                  Nenhum lead nesta etapa comercial
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      </div>

      {/* Drawer do Lead Selecionado */}
      <LeadDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }} 
        lead={selectedLead} 
        onLeadUpdated={fetchLeads} 
      />

      {/* MODAL DE OUTCOME (VENDA REALIZADA / PERDIDA) */}
      {outcomeModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className={`p-4 border-b border-border flex justify-between items-center ${outcomeModal.type === 'venda_realizada' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <h2 className={`font-bold ${outcomeModal.type === 'venda_realizada' ? 'text-emerald-500' : 'text-red-500'}`}>
                {outcomeModal.type === 'venda_realizada' ? '🎉 Registrar Venda Realizada' : '📉 Registrar Venda Perdida'}
              </h2>
              <button onClick={() => setOutcomeModal({ isOpen: false, type: null, leadId: null })} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleOutcomeSubmit} className="p-6 space-y-4">
              
              {outcomeModal.type === 'venda_perdida' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1">Motivo da Perda *</label>
                    <select 
                      required
                      value={outcomeForm.loss_reason || ''}
                      onChange={e => setOutcomeForm({...outcomeForm, loss_reason: e.target.value})}
                      className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">Selecione o motivo principal</option>
                      <option value="Preço">Preço alto / Desconto insuficiente</option>
                      <option value="Concorrência">Fechou com a Concorrência</option>
                      <option value="Sem Crédito">Reprovação de Crédito / Financeira</option>
                      <option value="Desistência">Cliente desistiu da compra</option>
                      <option value="Sem Retorno">Lead não responde (Ghosting)</option>
                      <option value="Timing">Momento errado (Adiou a compra)</option>
                      <option value="Produto Indisponível">Produto sem estoque</option>
                      <option value="Atendimento">Reclamação do atendimento</option>
                      <option value="Comprou Usado">Optou por um veículo usado de terceiros</option>
                      <option value="Outro">Outro motivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1">Observações da Perda (Máx 200 carac.)</label>
                    <textarea 
                      maxLength={200}
                      rows={3}
                      value={outcomeForm.loss_observation || ''}
                      onChange={e => setOutcomeForm({...outcomeForm, loss_observation: e.target.value})}
                      className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Detalhes adicionais sobre por que o negócio foi perdido..."
                    ></textarea>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center space-x-2 text-sm text-foreground/80 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!!outcomeForm.reactivation_date}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Define para 30 dias a partir de hoje
                            const d = new Date(); d.setDate(d.getDate() + 30);
                            setOutcomeForm({...outcomeForm, reactivation_date: d.toISOString().split('T')[0]});
                          } else {
                            setOutcomeForm({...outcomeForm, reactivation_date: null});
                          }
                        }}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Agendar Reativação Futura do Lead</span>
                    </label>
                  </div>
                  {outcomeForm.reactivation_date && (
                    <div className="mt-2 pl-6">
                      <input 
                        type="date" 
                        value={outcomeForm.reactivation_date}
                        onChange={e => setOutcomeForm({...outcomeForm, reactivation_date: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-foreground/5 border border-border rounded-lg px-3 py-1 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  )}
                </>
              )}

              {outcomeModal.type === 'venda_realizada' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1">Valor da Venda (R$) *</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={outcomeForm.sale_value || ''}
                      onChange={e => setOutcomeForm({...outcomeForm, sale_value: e.target.value})}
                      className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: 850000.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1">Produto Principal Vendido *</label>
                    <select 
                      required
                      value={outcomeForm.sale_product || ''}
                      onChange={e => setOutcomeForm({...outcomeForm, sale_product: e.target.value})}
                      className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Selecione o produto/serviço</option>
                      <option value="Caminhões Novos">Caminhões Novos</option>
                      <option value="Vans Novas">Vans Novas</option>
                      <option value="Caminhões Seminovos">Caminhões Seminovos (SelecTrucks)</option>
                      <option value="Vans Seminovas">Vans Seminovas</option>
                      <option value="Locação">Locação / Assinatura</option>
                      <option value="Consórcio">Cota de Consórcio</option>
                      <option value="Plano de Manutenção">Plano de Manutenção</option>
                      <option value="Seguro">Seguro</option>
                      <option value="Peças / Pneus">Peças / Pneus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1">Modelo Específico / Detalhes</label>
                    <input 
                      type="text"
                      value={outcomeForm.sale_model || ''}
                      onChange={e => setOutcomeForm({...outcomeForm, sale_model: e.target.value})}
                      className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: Actros 2651 LS 6x4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1">Data da Venda *</label>
                    <input 
                      type="date"
                      required
                      value={outcomeForm.sale_date || new Date().toISOString().split('T')[0]}
                      onChange={e => setOutcomeForm({...outcomeForm, sale_date: e.target.value})}
                      className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setOutcomeModal({ isOpen: false, type: null, leadId: null })}
                  className="px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all ${
                    outcomeModal.type === 'venda_realizada' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {loading ? 'Salvando...' : 'Confirmar Encerramento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col space-y-2 w-full max-w-[360px] px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-start space-x-3 transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-200'
                : 'bg-slate-900/90 border-slate-700/30 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <Check className="text-emerald-400 shrink-0 mt-0.5" size={16} />}
            {toast.type === 'error' && <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />}
            {toast.type === 'info' && <Info className="text-slate-400 shrink-0 mt-0.5" size={16} />}
            
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">{toast.title}</h4>
              <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-xs text-foreground/40 hover:text-foreground shrink-0 cursor-pointer p-0.5 rounded-full hover:bg-foreground/5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
