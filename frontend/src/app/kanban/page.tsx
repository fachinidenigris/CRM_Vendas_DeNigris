'use client';
import React, { useState } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { api } from '@/lib/api';

export default function KanbanPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    // Incrementa trigger para recarregar o KanbanBoard
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kanban</h2>
          <p className="text-foreground/60 mt-1">Arraste os leads para atualizar seus status operacionalmente.</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            + Novo Lead Manual
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <KanbanBoard key={refreshTrigger} />
      </div>

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
