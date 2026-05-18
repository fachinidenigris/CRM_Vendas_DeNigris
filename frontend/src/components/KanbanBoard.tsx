'use client';
import React, { useEffect, useState } from 'react';
import { MoreVertical, Clock, MessageSquare, Briefcase, RefreshCw, Calendar, Tag, User as UserIcon, Info, X } from 'lucide-react';
import { api, Lead, User as UserType } from '@/lib/api';
import { LeadDrawer } from './LeadDrawer';

const COLUMNS = [
  { id: 'novo', title: 'Leads Novos', color: 'border-indigo-500', bg: 'bg-indigo-500/5', help: 'Leads recém-chegados que ainda não foram atendidos.' },
  { id: 'qualificacao', title: 'Qualificação', color: 'border-blue-500', bg: 'bg-blue-500/5', help: 'Fase de sondagem: descobrir necessidade, capacidade financeira e timing.' },
  { id: 'distribuido', title: 'Distribuído', color: 'border-yellow-500', bg: 'bg-yellow-500/5', help: 'Lead atribuído e em negociação ativa com vendedor.' },
  { id: 'venda_realizada', title: 'Venda Realizada', color: 'border-emerald-500', bg: 'bg-emerald-500/5', help: 'Negócio fechado com sucesso.' },
  { id: 'venda_perdida', title: 'Venda Perdida', color: 'border-red-500', bg: 'bg-red-500/5', help: 'Negociação encerrada sem fechamento.' },
];

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [outcomeModal, setOutcomeModal] = useState<{ isOpen: boolean, type: 'venda_realizada' | 'venda_perdida' | null, leadId: string | null }>({ isOpen: false, type: null, leadId: null });
  
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
      setOutcomeModal({ isOpen: true, type: targetStatus, leadId });
      return;
    }

    // Atualiza status localmente primeiro para resposta instantânea na tela
    const originalLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));

    // Salva no banco de dados
    const updated = await api.updateLeadStatus(leadId, targetStatus);
    if (!updated) {
      setLeads(originalLeads);
    } else {
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
      updateData.sale_value = parseFloat(updateData.sale_value.replace(/[^0-9.-]+/g,""));
    }
    
    const success = await api.updateLead(outcomeModal.leadId, updateData);
    if (success) {
      setOutcomeModal({ isOpen: false, type: null, leadId: null });
      fetchLeads();
    } else {
      setLoading(false);
      alert('Erro ao atualizar lead e registrar fechamento.');
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
        <span className="font-medium text-sm">Carregando leads corporativos...</span>
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

  return (
    <div className="flex h-full min-h-[600px] space-x-4 overflow-x-auto pb-6 select-none">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter(l => l.status === col.id);
        const isOver = dragOverColumn === col.id;
        
        return (
          <div 
            key={col.id} 
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => setDragOverColumn(null)}
            className={`flex flex-col min-w-[320px] w-[320px] rounded-xl border transition-all duration-200 ${
              isOver ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-foreground/5'
            }`}
          >
            {/* Header da Coluna */}
            <div className={`p-4 border-t-4 ${col.color} bg-card rounded-t-xl border-b border-border flex justify-between items-center shadow-sm`}>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm text-foreground/90">{col.title}</h3>
                <Info size={14} className="text-foreground/30 hover:text-primary transition-colors cursor-help" title={col.help} />
              </div>
              <span className="text-xs text-foreground/50 font-normal">
                {colLeads.length}
              </span>
            </div>

            {/* Área de Cards */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[480px]">
              {colLeads.map((lead) => {
                const leadTags = lead.tags ? lead.tags.split(',') : [];
                return (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => openLeadDetails(lead)}
                    className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 active:border-primary transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-border group-hover:bg-primary transition-colors shrink-0"></div>
                    
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div className="flex items-center space-x-2 max-w-[85%]">
                        {/* Prioridade */}
                        {lead.priority && (
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            lead.priority === 'alta' ? 'bg-red-500/10 text-red-500' :
                            lead.priority === 'media' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-slate-500/10 text-slate-500'
                          }`}>
                            Prio {lead.priority}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/50 truncate">
                          {lead.source || 'IMAP'}
                        </span>
                      </div>
                      <button className="text-foreground/30 hover:text-foreground transition-colors shrink-0">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    
                    <div className="pl-2">
                      <h4 className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors truncate" title={lead.name}>
                        {lead.name}
                      </h4>
                      
                      <p className="text-xs text-foreground/60 mt-1 flex items-center truncate" title={lead.company || lead.source}>
                        <Briefcase size={12} className="mr-1 shrink-0 text-foreground/40" /> {lead.company || 'Pessoa Física'}
                      </p>

                      <p className="text-xs text-foreground/60 mt-0.5 flex items-center font-semibold truncate text-primary" title={lead.product_interest || ''}>
                        <Tag size={12} className="mr-1 shrink-0 text-primary/70" /> {lead.product_interest || 'Sem veículo de interesse'}
                      </p>

                      {/* Badges de Categorias / Tags */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {lead.category && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${getCategoryBadgeClass(lead.category)}`}>
                            {lead.category}
                          </span>
                        )}
                        {lead.client_type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-foreground/5 text-foreground/70 border border-border">
                            {lead.client_type}
                          </span>
                        )}
                        {leadTags.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/10">
                            {t.trim()}
                          </span>
                        ))}
                      </div>

                      {/* Rodapé do Card */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                        <div className="flex items-center space-x-1" title="Vendedor Atribuído">
                          <UserIcon size={12} className="text-foreground/40" />
                          <span className="text-[10px] text-foreground/60 font-medium truncate max-w-[120px]">
                            {lead.assigned_to_id ? (users.find(u => u.id === lead.assigned_to_id)?.name || 'Desconhecido') : 'Sem vendedor'}
                          </span>
                        </div>
                        <div className="flex text-foreground/40 items-center space-x-1 text-[10px]" title="Tempo sem atualização">
                          <Clock size={11} />
                          <span>
                            {Math.floor((new Date().getTime() - new Date(lead.updated_at).getTime()) / (1000 * 3600 * 24)) === 0 
                              ? 'Hoje' 
                              : `${Math.floor((new Date().getTime() - new Date(lead.updated_at).getTime()) / (1000 * 3600 * 24))} d atrás`}
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
    </div>
  );
}
