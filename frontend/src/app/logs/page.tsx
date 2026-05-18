'use client';

import React, { useState, useEffect } from 'react';
import { api, SystemLog } from '@/lib/api';
import { RefreshCw, Terminal, CheckCircle2, AlertTriangle, AlertOctagon, Info, Eye } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    const fetchedLogs = await api.getSystemLogs();
    setLogs(fetchedLogs);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Helper de Renderização de Ícones
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'EMAIL_RECEBIDO':
        return <CheckCircle2 className="text-emerald-500 mr-2 shrink-0" size={18} />;
      case 'EMAIL_IGNORADO':
        return <Info className="text-foreground/40 mr-2 shrink-0" size={18} />;
      case 'WARNING':
        return <AlertTriangle className="text-amber-500 mr-2 shrink-0" size={18} />;
      case 'ERROR':
        return <AlertOctagon className="text-red-500 mr-2 shrink-0" size={18} />;
      default:
        return <Info className="text-blue-400 mr-2 shrink-0" size={18} />;
    }
  };

  const getLogColorClass = (type: string) => {
    switch (type) {
      case 'EMAIL_RECEBIDO':
        return 'border-emerald-500/10 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04]';
      case 'EMAIL_IGNORADO':
        return 'border-border bg-foreground/[0.01] hover:bg-foreground/[0.02]';
      case 'WARNING':
        return 'border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]';
      case 'ERROR':
        return 'border-red-500/15 bg-red-500/[0.02] hover:bg-red-500/[0.04] animate-pulse';
      default:
        return 'border-border bg-foreground/[0.01]';
    }
  };

  // Filtragem dos Logs
  const filteredLogs = filterType === 'ALL' 
    ? logs 
    : logs.filter(l => l.log_type === filterType);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-3 text-foreground/50">
        <RefreshCw className="animate-spin" size={32} />
        <span>Abrindo console de logs comerciais em tempo real...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Terminal className="mr-2 text-primary" size={28} /> Central de Logs Comerciais
          </h2>
          <p className="text-foreground/60 mt-1">Monitore o robô IMAP e veja exatamente os leads recebidos, ignorados e alertas em tempo real.</p>
        </div>
        <button onClick={loadLogs} className="bg-foreground/5 text-foreground px-4 py-2 rounded-md font-medium hover:bg-foreground/10 transition-colors flex items-center">
          <RefreshCw size={16} className="mr-2" /> Atualizar
        </button>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 pb-2">
        <button 
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === 'ALL' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-foreground/5 text-foreground/75'}`}
        >
          Todos ({logs.length})
        </button>
        <button 
          onClick={() => setFilterType('EMAIL_RECEBIDO')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === 'EMAIL_RECEBIDO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card border-border hover:bg-emerald-500/10 text-emerald-500'}`}
        >
          Leads Recebidos ({logs.filter(l => l.log_type === 'EMAIL_RECEBIDO').length})
        </button>
        <button 
          onClick={() => setFilterType('EMAIL_IGNORADO')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === 'EMAIL_IGNORADO' ? 'bg-foreground/20 text-foreground border-foreground/35' : 'bg-card border-border hover:bg-foreground/5 text-foreground/60'}`}
        >
          Ignorados pelo Filtro ({logs.filter(l => l.log_type === 'EMAIL_IGNORADO').length})
        </button>
        <button 
          onClick={() => setFilterType('WARNING')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === 'WARNING' ? 'bg-amber-600 text-white border-amber-600' : 'bg-card border-border hover:bg-amber-500/10 text-amber-500'}`}
        >
          Alertas de SLA ({logs.filter(l => l.log_type === 'WARNING').length})
        </button>
        <button 
          onClick={() => setFilterType('ERROR')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === 'ERROR' ? 'bg-red-600 text-white border-red-600' : 'bg-card border-border hover:bg-red-500/10 text-red-500'}`}
        >
          Erros de Sistema ({logs.filter(l => l.log_type === 'ERROR').length})
        </button>
      </div>

      {/* Feed de Logs */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 font-mono text-sm max-h-[70vh] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-foreground/40 italic">Nenhum evento registrado com o filtro selecionado.</div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`border p-3.5 rounded-lg flex items-start justify-between space-x-4 transition-all ${getLogColorClass(log.log_type)}`}
            >
              <div className="flex items-start space-x-2">
                {getLogIcon(log.log_type)}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold text-foreground/40 bg-foreground/5 px-2 py-0.5 rounded border border-border">
                      {log.source}
                    </span>
                    <span className="text-xs text-foreground/35">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-foreground/80 leading-relaxed break-all text-xs lg:text-sm">
                    {log.message}
                  </p>
                </div>
              </div>
              
              <span className={`text-[10px] shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                log.log_type === 'EMAIL_RECEBIDO' ? 'bg-emerald-500/10 text-emerald-400' :
                log.log_type === 'EMAIL_IGNORADO' ? 'bg-foreground/5 text-foreground/45' :
                log.log_type === 'WARNING' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {log.log_type.replace('_', ' ')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
