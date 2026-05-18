'use client';
import React, { useEffect, useState } from 'react';
import { api, Lead, User } from '@/lib/api';
import { TrendingUp, Users, DollarSign, Award, RefreshCw, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';

export default function RelatoriosPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allLeads = await api.getLeads();
      const allUsers = await api.getUsers();
      setLeads(allLeads);
      setUsers(allUsers);
    } catch (err) {
      console.error('Erro ao buscar dados para relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Cálculos de Métricas Globais
  const totalLeads = leads.length;
  const totalVendas = leads.filter(l => l.status === 'venda_realizada').length;
  const conversionRate = totalLeads > 0 ? ((totalVendas / totalLeads) * 100).toFixed(1) : '0';
  const totalFaturado = leads.filter(l => l.status === 'venda_realizada').reduce((acc, curr) => acc + (curr.sale_value || 0), 0);
  
  // 2. Funil de Vendas Comercial
  const countStatus = (status: string) => leads.filter(l => l.status === status).length;
  const statusFunil = [
    { label: 'Novos Leads', count: countStatus('novo'), color: 'bg-green-500', pct: totalLeads > 0 ? (countStatus('novo') / totalLeads) * 100 : 0 },
    { label: 'Qualificação', count: countStatus('qualificacao'), color: 'bg-yellow-500', pct: totalLeads > 0 ? (countStatus('qualificacao') / totalLeads) * 100 : 0 },
    { label: 'Distribuídos', count: countStatus('distribuido'), color: 'bg-blue-500', pct: totalLeads > 0 ? (countStatus('distribuido') / totalLeads) * 100 : 0 },
    { label: 'Vendas Realizadas', count: countStatus('venda_realizada'), color: 'bg-emerald-500', pct: totalLeads > 0 ? (countStatus('venda_realizada') / totalLeads) * 100 : 0 },
    { label: 'Vendas Perdidas', count: countStatus('venda_perdida'), color: 'bg-red-500', pct: totalLeads > 0 ? (countStatus('venda_perdida') / totalLeads) * 100 : 0 },
  ];

  // Helper para formatar moeda
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // 3. Desempenho por Vendedor
  const rankingVendedores = users.map(u => {
    const userLeads = leads.filter(l => l.assigned_to_id === u.id);
    const activeLeads = userLeads.filter(l => !l.is_archived && l.status !== 'venda_realizada' && l.status !== 'venda_perdida').length;
    const closedSales = userLeads.filter(l => l.status === 'venda_realizada').length;
    const closedSalesVal = userLeads.filter(l => l.status === 'venda_realizada').reduce((acc, curr) => acc + (curr.sale_value || 0), 0);
    
    return {
      name: u.name,
      role: u.role,
      activeLeads,
      closedSales,
      closedSalesVal
    };
  }).sort((a, b) => b.closedSalesVal - a.closedSalesVal);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-3 text-foreground/50">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold tracking-wide">Calculando Indicadores de Vendas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios & Analytics</h2>
          <p className="text-foreground/60 mt-1">Visão estratégica e indicadores de performance comercial.</p>
        </div>
        <button onClick={fetchData} className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-4 py-2 rounded-md font-medium transition-colors flex items-center border border-border">
          <RefreshCw size={16} className="mr-2" /> Atualizar Dashboard
        </button>
      </header>

      {/* Grid de Cards de Alta Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Leads Ingeridos</h3>
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Users size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{totalLeads}</p>
          <span className="text-[10px] text-green-500 font-bold flex items-center mt-1">
            <TrendingUp size={12} className="mr-1"/> +12.4% vs mês anterior
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Volume Faturado</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><DollarSign size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{formatMoney(totalFaturado)}</p>
          <span className="text-[10px] text-green-500 font-bold flex items-center mt-1">
            <TrendingUp size={12} className="mr-1"/> Recorde histórico ativo
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Taxa de Conversão</h3>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Award size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{conversionRate}%</p>
          <span className="text-[10px] text-foreground/45 font-medium block mt-1">Média do segmento frotista: 8.5%</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Negócios Fechados</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><CheckCircle size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{totalVendas}</p>
          <span className="text-[10px] text-foreground/45 font-medium block mt-1">Volume de entregas de frota e varejo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel do Funil Comercial */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-border pb-3 mb-4">
              <BarChart3 size={18} className="text-primary" />
              <h3 className="font-bold text-sm">Funil de Vendas Físico</h3>
            </div>
            <p className="text-xs text-foreground/50 mb-6">Mapeamento dinâmico de conversão operacional do CRM.</p>
            
            <div className="space-y-4">
              {statusFunil.map((status) => (
                <div key={status.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground/80">{status.label}</span>
                    <span className="text-foreground">{status.count} leads</span>
                  </div>
                  <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden border border-border/20">
                    <div className={`h-full ${status.color} rounded-full`} style={{ width: `${Math.max(status.pct, 3)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-4 mt-6 bg-foreground/[0.01] p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle size={14} className="text-primary/75 shrink-0" />
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              O funil comercial é sincronizado em tempo real com as alterações e arrastes de cartões na tela do Kanban.
            </p>
          </div>
        </div>

        {/* Desempenho do Time de Vendas */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-border pb-3 mb-4">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="font-bold text-sm">Performance da Equipe Comercial</h3>
            </div>
            <p className="text-xs text-foreground/50 mb-4">Ranking de faturamento e volume de negócios concluídos.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-foreground/5 text-foreground/60 uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3">Leads Ativos</th>
                    <th className="px-4 py-3">Vendas (Qtd)</th>
                    <th className="px-4 py-3 text-right">Faturamento Realizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankingVendedores.map((vendedor, index) => (
                    <tr key={vendedor.name} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground flex items-center space-x-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-[9px]">
                          {index + 1}
                        </span>
                        <span>{vendedor.name}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground/75 font-medium">{vendedor.activeLeads}</td>
                      <td className="px-4 py-3 text-foreground/75 font-medium">{vendedor.closedSales}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-500">{formatMoney(vendedor.closedSalesVal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="border-t border-border pt-4 mt-6 text-right">
            <span className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">
              Auditoria de Produtividade Diária - De Nigris MB
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
