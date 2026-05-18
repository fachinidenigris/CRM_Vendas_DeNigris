'use client';
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, AlertCircle, Phone, MessageSquare, Mail, User, Briefcase, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, Lead, Task } from '@/lib/api';
import { LeadDrawer } from '@/components/LeadDrawer';

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Drawer e Modais
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form de Novo Lead Manual
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    product_interest: '',
    city_region: '',
    source: 'Cadastro Manual',
    status: 'leads_novos',
    urgency_level: 'Normal',
    ai_summary: 'Criado manualmente pelo painel comercial.'
  });

  const fetchData = async () => {
    setLoading(true);
    const [fetchedLeads, fetchedTasks] = await Promise.all([
      api.getLeads(),
      api.getTasks()
    ]);
    setLeads(fetchedLeads);
    setTasks(fetchedTasks);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleOpenLeadById = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      handleOpenLead(lead);
    }
  };

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o drawer do lead ao clicar no botão concluir
    await api.completeTask(taskId, true);
    fetchData();
  };

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.email) return;

    await api.createLead(newLeadForm);
    
    // Reset form e fecha modal
    setNewLeadForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      product_interest: '',
      city_region: '',
      source: 'Cadastro Manual',
      status: 'leads_novos',
      urgency_level: 'Normal',
      ai_summary: 'Criado manualmente pelo painel comercial.'
    });
    
    setIsModalOpen(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-3 text-foreground/50">
        <RefreshCw className="animate-spin" size={32} />
        <span>Carregando sua Agenda Operacional...</span>
      </div>
    );
  }

  // Filtragem dos dados (Foco Operacional Extremo)
  
  // 1. Leads novos de alta urgência ou tarefas não concluídas e atrasadas
  const now = new Date();
  const overdueTasks = tasks.filter(t => !t.is_completed && new Date(t.due_date) < now);
  const urgentLeads = leads.filter(l => l.status === 'leads_novos' && l.urgency_level === 'Alta');
  
  // 2. Tarefas marcadas para hoje (ou pendentes gerais)
  const todayTasks = tasks.filter(t => {
    if (t.is_completed) return false;
    const taskDate = new Date(t.due_date);
    return taskDate.toDateString() === now.toDateString() || taskDate > now; // Hoje ou futuras pendentes
  });

  // 3. Todos os Novos Leads (etapa inicial do funil)
  const newLeads = leads.filter(l => l.status === 'leads_novos');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agenda Operacional</h2>
          <p className="text-foreground/60 mt-1">Sua visão geral de produtividade diária sem atritos.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
            + Novo Lead Manual
          </button>
          <button onClick={fetchData} className="bg-foreground/5 text-foreground px-4 py-2 rounded-md font-medium hover:bg-foreground/10 transition-colors flex items-center">
            <RefreshCw size={16} className="mr-2" /> Atualizar
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna 1: Novos Leads */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-green-500 font-semibold mb-4 border-b border-border pb-2">
            <User size={20} />
            <h3>Novos Leads ({newLeads.length})</h3>
          </div>
          
          {newLeads.map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => handleOpenLead(lead)}
              className="bg-card border border-border rounded-lg p-4 shadow-sm hover:border-green-500/50 transition-colors cursor-pointer"
            >
               <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold px-2 py-1 bg-green-500/10 text-green-500 rounded-full">Entrada Inbox</span>
                <span className="text-xs text-foreground/50 flex items-center">
                  <Clock size={12} className="mr-1"/> {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h4 className="font-bold text-lg">{lead.name}</h4>
              <p className="text-sm text-foreground/70 mb-3 flex items-center mt-1">Origem: {lead.source}</p>
              
              {lead.ai_summary && (
                <div className="bg-background rounded p-2 text-sm text-foreground/80 mb-3 border border-border">
                  <span className="font-semibold block mb-1">Resumo Inteligente IA:</span>
                  {lead.ai_summary}
                </div>
              )}
              
              <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
                <span className="text-xs font-medium text-foreground/60">Ação Necessária: Responder e-mail</span>
                <button className="flex items-center space-x-1 text-xs bg-foreground/10 hover:bg-foreground/20 px-2 py-1 rounded transition-colors">
                  <span>Abrir Ficha</span>
                </button>
              </div>
            </div>
          ))}

          {newLeads.length === 0 && (
            <div className="text-center p-6 border border-dashed border-border rounded-lg text-foreground/40 text-sm">
              Excelente! Nenhum novo lead sem resposta pendente.
            </div>
          )}
        </div>

        {/* Coluna 2: Tarefas do Dia */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-blue-500 font-semibold mb-4 border-b border-border pb-2">
            <Calendar size={20} />
            <h3>Tarefas de Hoje / Pendentes ({todayTasks.length})</h3>
          </div>
          
          {todayTasks.map((task) => {
            const lead = leads.find(l => l.id === task.lead_id);
            return (
              <div 
                key={task.id} 
                onClick={() => lead && handleOpenLead(lead)}
                className="bg-card border border-border rounded-lg p-4 shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full flex items-center">
                    {task.task_type === 'ligacao' ? <Phone size={12} className="mr-1"/> : <FileText size={12} className="mr-1"/>}
                    {task.task_type.toUpperCase()}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="font-bold text-lg">{task.title}</h4>
                {lead && <p className="text-sm text-foreground/70 mb-2 flex items-center"><Briefcase size={14} className="mr-1"/> {lead.company || lead.name}</p>}
                
                <div className="text-sm text-foreground/80 mb-3 whitespace-pre-wrap">
                  {task.description}
                </div>
                
                <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
                  <span className="text-xs font-medium text-foreground/60">Responsável: Você</span>
                  <button 
                    onClick={(e) => handleCompleteTask(task.id, e)}
                    className="flex items-center space-x-1 text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            );
          })}

          {todayTasks.length === 0 && (
            <div className="text-center p-6 border border-dashed border-border rounded-lg text-foreground/40 text-sm">
              Nenhuma tarefa pendente para hoje.
            </div>
          )}
        </div>

        {/* Coluna 3: Follow-ups Atrasados / Urgentes */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-red-500 font-semibold mb-4 border-b border-border pb-2">
            <AlertCircle size={20} />
            <h3>Atrasados / SLA Vencido ({overdueTasks.length + urgentLeads.length})</h3>
          </div>
          
          {urgentLeads.map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => handleOpenLead(lead)}
              className="bg-card border border-red-500/30 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-500 rounded-full">SLA Estourado / Urgente</span>
                <span className="text-xs text-foreground/50 flex items-center"><Clock size={12} className="mr-1"/> Novo</span>
              </div>
              <h4 className="font-bold text-lg">{lead.name}</h4>
              <p className="text-sm text-foreground/70 mb-3 flex items-center mt-1"><Briefcase size={14} className="mr-1"/> {lead.company || lead.source}</p>
              
              {lead.ai_summary && (
                <div className="bg-background rounded p-2 text-sm text-foreground/80 mb-3 border border-border">
                  <span className="font-semibold block mb-1">Resumo IA:</span>
                  {lead.ai_summary}
                </div>
              )}
              
              <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
                <span className="text-xs font-medium text-foreground/60">Ação Pendente: Fazer 1º contato</span>
                <button className="flex items-center space-x-1 text-xs bg-foreground/10 hover:bg-foreground/20 px-2 py-1 rounded transition-colors">
                  <Phone size={12} />
                  <span>Contatar</span>
                </button>
              </div>
            </div>
          ))}

          {overdueTasks.map((task) => {
            const lead = leads.find(l => l.id === task.lead_id);
            return (
              <div 
                key={task.id} 
                onClick={() => lead && handleOpenLead(lead)}
                className="bg-card border border-red-500/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer opacity-90"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-500 rounded-full flex items-center">
                    <AlertCircle size={12} className="mr-1"/> Follow-up Atrasado
                  </span>
                  <span className="text-xs text-red-400 font-medium">
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h4 className="font-bold text-lg">{task.title}</h4>
                {lead && <p className="text-sm text-foreground/70 mb-2 flex items-center"><User size={14} className="mr-1"/> {lead.name}</p>}
                <p className="text-sm text-foreground/60 mb-3">{task.description}</p>
                
                <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
                  <span className="text-xs font-medium text-foreground/60">SLA Excedido</span>
                  <button 
                    onClick={(e) => handleCompleteTask(task.id, e)}
                    className="flex items-center space-x-1 text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                  >
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            );
          })}

          {urgentLeads.length === 0 && overdueTasks.length === 0 && (
            <div className="text-center p-6 border border-dashed border-border rounded-lg text-foreground/40 text-sm">
              Tudo em dia! Sem atrasos na sua fila.
            </div>
          )}
        </div>
      </div>

      {/* Drawer unificado */}
      <LeadDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        lead={selectedLead}
        onLeadUpdated={fetchData}
      />

      {/* Modal de Cadastro Manual */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[95vw] bg-card border border-border rounded-xl shadow-2xl p-6 z-50 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold">Novo Lead Comercial</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-foreground/40 hover:text-foreground text-sm p-1 rounded-full hover:bg-foreground/5">✕</button>
            </div>
            
            <form onSubmit={handleCreateLeadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="Ex: Fabio Fachini"
                  className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">E-mail *</label>
                  <input 
                    type="email" 
                    required
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    placeholder="exemplo@gmail.com"
                    className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={newLeadForm.phone || ''}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Empresa</label>
                  <input 
                    type="text" 
                    value={newLeadForm.company || ''}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                    placeholder="Nome da Transportadora"
                    className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/75 block mb-1">Cidade / Região</label>
                  <input 
                    type="text" 
                    value={newLeadForm.city_region || ''}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, city_region: e.target.value })}
                    placeholder="Ex: Sorocaba/SP"
                    className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Interesse / Produto</label>
                <input 
                  type="text" 
                  value={newLeadForm.product_interest || ''}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, product_interest: e.target.value })}
                  placeholder="Ex: Atego 2430 ou Renovação de Frota"
                  className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm font-medium transition-colors"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
