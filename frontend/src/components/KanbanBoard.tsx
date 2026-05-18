'use client';
import React, { useEffect, useState } from 'react';
import { MoreVertical, Clock, MessageSquare, Briefcase, RefreshCw, Calendar, Tag, User as UserIcon, Info } from 'lucide-react';
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

    // Atualiza status localmente primeiro para resposta instantânea na tela
    const originalLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));

    // Salva no banco de dados
    const updated = await api.updateLeadStatus(leadId, targetStatus);
    if (!updated) {
      // Reverte se falhar
      setLeads(originalLeads);
    } else {
      // Recarrega para obter timeline atualizada no drawer se ele estiver aberto
      fetchLeads();
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
    </div>
  );
}
