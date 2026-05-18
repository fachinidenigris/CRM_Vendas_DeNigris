'use client';
import React, { useEffect, useState } from 'react';
import { api, Lead, User } from '@/lib/api';
import { Search, Archive, RefreshCw, Filter, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

export default function HistoricoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const allLeads = await api.getLeads();
      const allUsers = await api.getUsers();
      setUsers(allUsers);
      
      const activeUser = api.getCurrentUser();
      
      // Filtra apenas leads fechados ou arquivados
      let closedLeads = allLeads.filter(l => l.is_archived || l.status === 'venda_realizada' || l.status === 'venda_perdida');
      
      // Se for vendedor, ve apenas os proprios
      if (activeUser?.role === 'vendedor') {
        closedLeads = closedLeads.filter(l => l.assigned_to_id === activeUser.id);
      }
      
      setLeads(closedLeads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered array
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.company && l.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterType === 'venda_realizada') return matchesSearch && l.status === 'venda_realizada';
    if (filterType === 'venda_perdida') return matchesSearch && l.status === 'venda_perdida';
    return matchesSearch;
  });

  // Analytics Metrics
  const totalGanha = leads.filter(l => l.status === 'venda_realizada').length;
  const totalPerdida = leads.filter(l => l.status === 'venda_perdida').length;
  const valorTotal = leads.filter(l => l.status === 'venda_realizada').reduce((acc, curr) => acc + (curr.sale_value || 0), 0);

  // Helper for money format
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  // Helper for Date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-3 text-foreground/50">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold tracking-wide">Carregando Acervo Comercial...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Histórico de Fechamentos</h2>
          <p className="text-foreground/60 mt-1">Acervo permanente de negócios ganhos e perdidos.</p>
        </div>
      </header>

      {/* Métricas de Alto Nível */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-sm">Vendas Realizadas</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><TrendingUp size={18}/></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{totalGanha}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-sm">Vendas Perdidas</h3>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={18}/></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{totalPerdida}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-sm">Volume Faturado Global</h3>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><DollarSign size={18}/></div>
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{formatMoney(valorTotal)}</p>
        </div>
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-card border border-border p-4 rounded-xl gap-4">
        <div className="relative w-full md:w-1/3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou empresa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-foreground/40" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="all">Todos os Fechamentos</option>
            <option value="venda_realizada">Apenas Vendas Realizadas</option>
            <option value="venda_perdida">Apenas Vendas Perdidas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-foreground/60 uppercase bg-foreground/5 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold">Cliente / Empresa</th>
                <th className="px-6 py-4 font-bold">Desfecho</th>
                <th className="px-6 py-4 font-bold">Data</th>
                <th className="px-6 py-4 font-bold">Motivo / Valor</th>
                <th className="px-6 py-4 font-bold">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{lead.name}</div>
                      <div className="text-xs text-foreground/50 mt-0.5">{lead.company || lead.client_type || 'Pessoa Física'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.status === 'venda_realizada' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Venda Realizada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          Venda Perdida
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-foreground/80">
                      {lead.sale_date ? formatDate(lead.sale_date) : formatDate(lead.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      {lead.status === 'venda_realizada' ? (
                        <div className="font-bold text-emerald-500">{formatMoney(lead.sale_value || 0)}</div>
                      ) : (
                        <div className="text-red-400 font-medium">{lead.loss_reason || 'Não informado'}</div>
                      )}
                      {(lead.sale_product || lead.loss_observation) && (
                        <div className="text-[10px] text-foreground/50 mt-1 truncate max-w-[200px]" title={lead.sale_product || lead.loss_observation}>
                          {lead.sale_product || lead.loss_observation}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground/80 font-medium">
                        {lead.assigned_to_id ? (users.find(u => u.id === lead.assigned_to_id)?.name || 'Desconhecido') : 'Sem vendedor'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/40">
                    <Archive size={32} className="mx-auto mb-3 opacity-20" />
                    Nenhum registro encontrado no histórico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
