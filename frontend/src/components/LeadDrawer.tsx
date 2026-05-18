'use client';
import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Clock, Edit3, Send, CheckCircle2, MessageSquare, Shield, Landmark, DollarSign, Archive } from 'lucide-react';
import { api, Lead, User } from '@/lib/api';

interface LeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdated?: () => void;
}

type TabType = 'timeline' | 'contato' | 'qualificacao' | 'negociacao';

export function LeadDrawer({ isOpen, onClose, lead, onLeadUpdated }: LeadDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [activities, setActivities] = useState<any[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const currentUser = typeof window !== 'undefined' ? api.getCurrentUser() : null;
  const isGestor = currentUser && currentUser.role !== 'vendedor';

  // Estados dos campos de edição do lead (cópia local para edição)
  const [formData, setFormData] = useState<Partial<Lead>>({});

  const fetchTimeline = async () => {
    if (!lead) return;
    const data = await api.getActivities(lead.id);
    setActivities(data);
  };

  const fetchUsers = async () => {
    const data = await api.getUsers();
    setUsers(data);
  };

  useEffect(() => {
    if (isOpen && lead) {
      fetchTimeline();
      fetchUsers();
      // Inicializa os dados de edição local
      setFormData({
        category: lead.category || '',
        subcategory: lead.subcategory || '',
        client_type: lead.client_type || 'Autônomo',
        tags: lead.tags || '',
        vehicle_type: lead.vehicle_type || '',
        application: lead.application || '',
        segment: lead.segment || '',
        quantity: lead.quantity || 1,
        financial_need: lead.financial_need || '',
        purchase_timeline: lead.purchase_timeline || '',
        urgency: lead.urgency || '',
        quick_contact_status: lead.quick_contact_status || '',
        value_range: lead.value_range || '',
        down_payment: lead.down_payment || '',
        finance_amount: lead.finance_amount || '',
        trade_in_used: lead.trade_in_used || '',
        next_action_title: lead.next_action_title || '',
        negotiated_value: lead.negotiated_value || '',
        finance_institution: lead.finance_institution || '',
        close_probability: lead.close_probability || '',
        billing_forecast: lead.billing_forecast || '',
        loss_reason: lead.loss_reason || '',
        assigned_to_id: lead.assigned_to_id || '',
        status: lead.status || '',
      });
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setLoading(true);
    await api.addActivity(lead.id, 'nota_adicionada', noteContent);
    
    if (createFollowUp) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await api.createTask({
        lead_id: lead.id,
        title: `Retorno agendado: ${lead.name}`,
        description: `Follow-up gerado a partir de nota: "${noteContent.substring(0, 50)}..."`,
        due_date: tomorrow.toISOString(),
        task_type: 'ligacao'
      });
    }

    setNoteContent('');
    setCreateFollowUp(false);
    await fetchTimeline();
    setLoading(false);
    
    if (onLeadUpdated) onLeadUpdated();
  };

  const handleStatusChange = async (newStatus: string) => {
    await api.updateLeadStatus(lead.id, newStatus);
    setFormData(prev => ({ ...prev, status: newStatus }));
    if (onLeadUpdated) onLeadUpdated();
    await fetchTimeline();
  };

  const handleFieldChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    const updated = await api.updateLead(lead.id, formData);
    setLoading(false);
    if (updated) {
      if (onLeadUpdated) onLeadUpdated();
      await fetchTimeline();
      alert('Informações comerciais salvas com sucesso!');
    } else {
      alert('Erro ao salvar alterações no servidor.');
    }
  };

  const handleSendToWhatsApp = () => {
    if (!lead) return;
    
    const clientType = lead.client_type || 'Não definido';
    const company = lead.company || 'Pessoa Física';
    const cityRegion = lead.city_region || 'Não informada';
    const product = lead.product_interest || 'Sem veículo de interesse';
    const aiSummary = lead.ai_summary || 'Nenhum resumo gerado pela IA.';
    const leadPhone = lead.phone || 'Sem telefone';
    const leadEmail = lead.email || 'Sem e-mail';
    
    const text = `📋 *RESUMO EXECUTIVO DO LEAD* 📋\n` +
                 `━━━━━━━━━━━━━━━━━━━━━\n` +
                 `👤 *Cliente:* ${lead.name}\n` +
                 `🏢 *Tipo:* ${clientType} (${company})\n` +
                 `📞 *Contato:* ${leadPhone}\n` +
                 `📧 *E-mail:* ${leadEmail}\n` +
                 `📍 *Região:* ${cityRegion}\n` +
                 `🚛 *Interesse:* ${product}\n\n` +
                 `🤖 *Análise da IA:* ${aiSummary}\n` +
                 `━━━━━━━━━━━━━━━━━━━━━\n` +
                 `💬 _Gerado pelo CRM Vendas DeNigris_`;
                 
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={onClose} />
      
      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 h-full w-[650px] max-w-full bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
        
        {/* Header do Drawer */}
        <div className="p-6 border-b border-border flex justify-between items-start">
          <div className="max-w-[85%]">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded uppercase">
                {lead.status.replace(/_/g, ' ')}
              </span>
              {lead.category && (
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold rounded uppercase">
                  {lead.category}
                </span>
              )}
              {lead.urgency_level && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold rounded uppercase flex items-center">
                  <Clock size={12} className="mr-1"/> {lead.urgency_level}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground truncate" title={lead.name}>
              {lead.name}
            </h2>
            <p className="text-foreground/60 text-sm flex items-center mt-1">
              {lead.company || 'Pessoa Física'} • {lead.city_region || 'Região não informada'}
            </p>
            <div className="flex items-center space-x-2 mt-3">
              <button 
                onClick={handleSendToWhatsApp}
                title="Gera um resumo executivo do Lead e abre no WhatsApp para enviar ao Vendedor"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] px-3 py-1.5 rounded-lg transition-colors flex items-center shadow-sm uppercase tracking-wider"
              >
                <Send size={11} className="mr-1.5" />
                Enviar Repasse via WhatsApp
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/10 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Abas de Navegação (Guided Wizard) */}
        <div className="flex border-b border-border bg-foreground/5 px-2">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'
            }`}
          >
            Histórico & Notas
          </button>
          <button 
            onClick={() => setActiveTab('contato')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === 'contato' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'
            }`}
          >
            1. Primeiro Contato
          </button>
          <button 
            onClick={() => setActiveTab('qualificacao')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === 'qualificacao' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'
            }`}
          >
            2. Qualificação
          </button>
          <button 
            onClick={() => setActiveTab('negociacao')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === 'negociacao' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'
            }`}
          >
            3. Negociação & Fechamento
          </button>
        </div>

        {/* Corpo do Drawer (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Ações Rápidas (Atrito Operacional Zero) */}
          <div className="grid grid-cols-4 gap-2 bg-foreground/5 p-2 rounded-xl border border-border">
            <a href={`tel:${lead.phone}`} className="flex flex-col items-center justify-center p-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
              <Phone size={18} className="mb-1"/>
              <span className="text-[10px] font-bold uppercase">Ligar</span>
            </a>
            <a 
              href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-3 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-all"
            >
              <MessageSquare size={18} className="mb-1"/>
              <span className="text-[10px] font-bold uppercase">WhatsApp</span>
            </a>
            <a href={`mailto:${lead.email}`} className="flex flex-col items-center justify-center p-3 bg-card border border-border text-foreground/80 rounded-lg hover:bg-foreground/5 transition-all">
              <Mail size={18} className="mb-1"/>
              <span className="text-[10px] font-bold uppercase">E-mail</span>
            </a>
            <div className="relative">
              <select 
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-full text-center p-3 bg-foreground/10 text-foreground/80 rounded-lg hover:bg-foreground/20 transition-all text-[10px] font-bold uppercase border-0 outline-none appearance-none cursor-pointer"
              >
                <option value="novo">Leads Novos</option>
                <option value="qualificacao">Qualificação</option>
                <option value="distribuido">Distribuído</option>
                <option value="venda_realizada" disabled>Venda Realizada (Arraste no Kanban)</option>
                <option value="venda_perdida" disabled>Venda Perdida (Arraste no Kanban)</option>
              </select>
            </div>
          </div>

          {/* ABA 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Resumo IA */}
              {lead.ai_summary && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex items-center space-x-2 text-primary font-bold mb-2">
                    <Edit3 size={16} />
                    <h3 className="text-sm font-semibold">Análise de Qualificação IA (Gemini)</h3>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {lead.ai_summary}
                  </p>
                </div>
              )}

              {/* Registro de Nota */}
              <div>
                <h3 className="font-bold text-sm text-foreground/80 mb-3 uppercase tracking-wider">Registrar Atividade Manual</h3>
                <form onSubmit={handleAddNote} className="bg-background rounded-xl border border-border p-1.5 focus-within:ring-2 focus-within:ring-primary/45 transition-shadow">
                  <textarea 
                    className="w-full bg-transparent p-3 outline-none resize-none text-sm text-foreground/80" 
                    rows={3} 
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Ex: Liguei para o cliente, confirmou interesse e agendou visita técnica na concessionária..."
                  />
                  <div className="flex justify-between items-center p-2 bg-card rounded-lg border-t border-border">
                    <div className="flex items-center space-x-2 text-xs text-foreground/50">
                      <input 
                        type="checkbox" 
                        id="createTask" 
                        checked={createFollowUp}
                        onChange={(e) => setCreateFollowUp(e.target.checked)}
                        className="rounded bg-background border-border text-primary focus:ring-primary" 
                      />
                      <label htmlFor="createTask" className="font-medium cursor-pointer">Criar follow-up automático amanhã</label>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/95 transition-colors disabled:opacity-50"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Timeline real */}
              <div>
                <h3 className="font-bold text-sm text-foreground/80 mb-4 uppercase tracking-wider">Histórico de Linha do Tempo</h3>
                <div className="space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="flex space-x-3 group">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card shadow-sm text-foreground/80">
                          {act.activity_type === 'email_recebido' ? <Mail size={14} className="text-indigo-500" /> : 
                           act.activity_type === 'alerta_sla' ? <Clock size={14} className="text-red-500" /> :
                           act.activity_type === 'status_alterado' ? <CheckCircle2 size={14} className="text-yellow-500" /> :
                           <MessageSquare size={14} className="text-primary" />}
                        </div>
                        <div className="w-0.5 h-full bg-border mt-2 group-last:bg-transparent"></div>
                      </div>
                      <div className="flex-1 p-3.5 rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-[10px] text-primary uppercase tracking-widest">
                            {act.activity_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-foreground/50 font-medium">
                            {new Date(act.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/85 whitespace-pre-wrap mt-2 leading-relaxed">
                          {act.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {activities.length === 0 && (
                    <div className="text-center py-6 text-xs text-foreground/40 border border-dashed border-border rounded-xl">
                      Nenhuma atividade operacional registrada ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: PRIMEIRO CONTATO */}
          {activeTab === 'contato' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h3 className="font-bold text-sm text-foreground/80 uppercase">Atendimento Inicial & Necessidades</h3>
                <span className="text-xs text-foreground/40">Gravação automática ao alterar</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Categoria Geral</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não classificado</option>
                    <option value="Veículos Novos">Veículos Novos</option>
                    <option value="Veículos Usados">Veículos Usados</option>
                    <option value="Locação">Locação</option>
                    <option value="Produtos Agregados">Produtos Agregados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Subcategoria</label>
                  <select 
                    value={formData.subcategory}
                    onChange={(e) => handleFieldChange('subcategory', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não classificado</option>
                    <option value="Caminhões Mercedes-Benz">Caminhões Mercedes-Benz (Novos)</option>
                    <option value="Vans Mercedes-Benz">Vans Mercedes-Benz (Novas)</option>
                    <option value="Caminhões usados">Caminhões Usados Multimarcas</option>
                    <option value="Vans usadas">Vans Usadas Multimarcas</option>
                    <option value="Locação de Caminhões">Locação de Caminhões</option>
                    <option value="Locação de Vans">Locação de Vans</option>
                    <option value="Seguro">Seguro</option>
                    <option value="Consórcio">Consórcio</option>
                    <option value="Plano de manutenção">Plano de Manutenção</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Serviços financeiros">Serviços Financeiros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Perfil de Cliente</label>
                  <select 
                    value={formData.client_type}
                    onChange={(e) => handleFieldChange('client_type', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="Autônomo">Autônomo</option>
                    <option value="Frota">Frota / Frotista</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Tipo de Veículo</label>
                  <input 
                    type="text" 
                    value={formData.vehicle_type}
                    onChange={(e) => handleFieldChange('vehicle_type', e.target.value)}
                    placeholder="Ex: Leve, Semi-pesado, Extrapesado, Cavalo Mecânico"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Aplicação de Uso</label>
                  <input 
                    type="text" 
                    value={formData.application}
                    onChange={(e) => handleFieldChange('application', e.target.value)}
                    placeholder="Ex: Carga Seca, Basculante, Betoneira, Frigorífico"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Segmento de Operação</label>
                  <select 
                    value={formData.segment}
                    onChange={(e) => handleFieldChange('segment', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não informado</option>
                    <option value="logística">Logística / Transporte Geral</option>
                    <option value="agronegócio">Agronegócio / Grãos / Cana</option>
                    <option value="construção">Construção Civil / Infra</option>
                    <option value="distribuição">Distribuição Urbana de Bebidas/Alimentos</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Quantidade de Unidades</label>
                  <input 
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Necessidade de Financiamento</label>
                  <select 
                    value={formData.financial_need}
                    onChange={(e) => handleFieldChange('financial_need', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não informado</option>
                    <option value="cdc">Sim - CDC Tradicional</option>
                    <option value="finame">Sim - Finame BNDES</option>
                    <option value="consorcio">Consórcio Contemplado</option>
                    <option value="leasing">Leasing Operacional</option>
                    <option value="vista">Não - Pagamento à Vista</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Prazo Estimado de Compra</label>
                  <select 
                    value={formData.purchase_timeline}
                    onChange={(e) => handleFieldChange('purchase_timeline', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não informado</option>
                    <option value="imediato">Imediato (Urgente)</option>
                    <option value="15dias">Até 15 Dias</option>
                    <option value="30dias">Até 30 Dias</option>
                    <option value="60dias">Até 60 Dias</option>
                    <option value="cotacao">Apenas Cotação / Planejamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Status do Contato Rápido</label>
                  <select 
                    value={formData.quick_contact_status}
                    onChange={(e) => handleFieldChange('quick_contact_status', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não verificado</option>
                    <option value="interessado">Interessado / Avançar</option>
                    <option value="nao_atendeu">Não Atendeu / Tentar Novamente</option>
                    <option value="ligar_tarde">Ligar Mais Tarde</option>
                    <option value="sem_interesse">Sem Interesse / Descartar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Tags do Lead (separadas por vírgula)</label>
                <input 
                  type="text" 
                  value={formData.tags}
                  onChange={(e) => handleFieldChange('tags', e.target.value)}
                  placeholder="Ex: urgente, frota, alto potencial, concorrencia"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-bold text-xs uppercase px-5 py-3 rounded-lg hover:bg-primary/95 transition-all shadow"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* ABA 3: QUALIFICACAO */}
          {activeTab === 'qualificacao' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h3 className="font-bold text-sm text-foreground/80 uppercase">Estudo de Viabilidade & Entrada</h3>
                <span className="text-xs text-foreground/40">Gravação automática ao salvar</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <DollarSign size={13} className="mr-1 text-primary"/> Faixa de Valor Estimado
                  </label>
                  <input 
                    type="text" 
                    value={formData.value_range}
                    onChange={(e) => handleFieldChange('value_range', e.target.value)}
                    placeholder="Ex: 500.000,00"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <DollarSign size={13} className="mr-1 text-primary"/> Valor de Entrada Estimado
                  </label>
                  <input 
                    type="text" 
                    value={formData.down_payment}
                    onChange={(e) => handleFieldChange('down_payment', e.target.value)}
                    placeholder="Ex: 100.000,00"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <DollarSign size={13} className="mr-1 text-primary"/> Saldo a Financiar
                  </label>
                  <input 
                    type="text" 
                    value={formData.finance_amount}
                    onChange={(e) => handleFieldChange('finance_amount', e.target.value)}
                    placeholder="Ex: 400.000,00"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <Archive size={13} className="mr-1 text-primary"/> Veículo Usado na Troca
                  </label>
                  <input 
                    type="text" 
                    value={formData.trade_in_used}
                    onChange={(e) => handleFieldChange('trade_in_used', e.target.value)}
                    placeholder="Ex: Sim (1 Atego 2426 Usado) ou Não"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                  <Shield size={13} className="mr-1 text-primary"/> Próxima Ação Mapeada
                </label>
                <input 
                  type="text" 
                  value={formData.next_action_title}
                  onChange={(e) => handleFieldChange('next_action_title', e.target.value)}
                  placeholder="Ex: Agendar avaliação presencial do usado com perito de frotas..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-bold text-xs uppercase px-5 py-3 rounded-lg hover:bg-primary/95 transition-all shadow"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* ABA 4: NEGOCIACAO */}
          {activeTab === 'negociacao' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h3 className="font-bold text-sm text-foreground/80 uppercase">Fechamento & Atribuição de Fila</h3>
                <span className="text-xs text-foreground/40">Exclusivo para Gerência e Vendas</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Valor Final Fechado</label>
                  <input 
                    type="text" 
                    value={formData.negotiated_value}
                    onChange={(e) => handleFieldChange('negotiated_value', e.target.value)}
                    placeholder="Ex: 495.000,00"
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <Landmark size={13} className="mr-1 text-primary"/> Instituição Financeira
                  </label>
                  <select 
                    value={formData.finance_institution}
                    onChange={(e) => handleFieldChange('finance_institution', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não se aplica / À Vista</option>
                    <option value="Banco Mercedes-Benz">Banco Mercedes-Benz</option>
                    <option value="Banco Itaú">Banco Itaú</option>
                    <option value="Banco Bradesco">Banco Bradesco</option>
                    <option value="Banco Safra">Banco Safra</option>
                    <option value="Outro">Outro Banco de Varejo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5">Probabilidade de Fechamento</label>
                  <select 
                    value={formData.close_probability}
                    onChange={(e) => handleFieldChange('close_probability', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  >
                    <option value="">Não informado</option>
                    <option value="10%">10% (Frio)</option>
                    <option value="30%">30% (Qualificação)</option>
                    <option value="50%">50% (Proposta enviada)</option>
                    <option value="70%">70% (Negociação avançada)</option>
                    <option value="90%">90% (Crédito aprovado / Minuta)</option>
                    <option value="100%">100% (Venda Ganha)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <Calendar size={13} className="mr-1 text-primary"/> Previsão de Faturamento
                  </label>
                  <input 
                    type="date" 
                    value={formData.billing_forecast ? formData.billing_forecast.substring(0, 10) : ''}
                    onChange={(e) => handleFieldChange('billing_forecast', e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground/80 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <Archive size={13} className="mr-1 text-red-500"/> Motivo da Perda (Se aplicável)
                  </label>
                  <select 
                    disabled
                    value={formData.loss_reason || ''}
                    className="w-full bg-foreground/5 border border-border rounded-lg p-2.5 text-sm text-foreground/50 outline-none cursor-not-allowed"
                  >
                    <option value="">Nenhum / Ativo</option>
                    <option value={formData.loss_reason || ''}>{formData.loss_reason}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground/60 uppercase mb-1.5 flex items-center">
                    <UserIcon className="mr-1 text-primary" size={13}/> Vendedor Responsável
                  </label>
                  <select 
                    value={formData.assigned_to_id || ''}
                    onChange={(e) => handleFieldChange('assigned_to_id', e.target.value || null)}
                    disabled={!isGestor}
                    title={!isGestor ? 'Apenas gerentes podem alterar o responsável.' : ''}
                    className={`w-full bg-background border border-border rounded-lg p-2.5 text-sm outline-none focus:border-primary ${!isGestor ? 'opacity-70 cursor-not-allowed' : 'text-foreground/80'}`}
                  >
                    <option value="">Sem vendedor (Fila Geral)</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-bold text-xs uppercase px-5 py-3 rounded-lg hover:bg-primary/95 transition-all shadow"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// Icon wrapper helper
function UserIcon({ className, size }: { className?: string; size?: number }) {
  return <Shield className={className} size={size} />;
}
