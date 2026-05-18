'use client';
import React, { useState } from 'react';
import { Megaphone, Mail, MessageSquare, Sparkles, Send, Users, ShieldAlert, Award, Calendar, Check } from 'lucide-react';

export default function MarketingPage() {
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<{ show: boolean; title: string; desc: string }>({
    show: false,
    title: '',
    desc: ''
  });

  const [campaignForm, setCampaignForm] = useState({
    title: '',
    channel: 'email',
    segment: 'inativos',
    aiTone: 'formal',
    customSubject: '',
    customBody: ''
  });

  // Campanhas mockadas em andamento
  const [campaigns, setCampaigns] = useState([
    { id: 1, title: 'Oferta Especial Atego 2430', channel: 'whatsapp', segment: 'Frotistas Sorocaba', status: 'active', reach: 45, date: '18/05/2026' },
    { id: 2, title: 'Renovação de Frota Actros 2026', channel: 'email', segment: 'Grandes Transportadoras', status: 'scheduled', reach: 182, date: '22/05/2026' },
    { id: 3, title: 'Feirão de Seminovos de Nigris', channel: 'email', segment: 'Contatos Inativos > 30d', status: 'completed', reach: 620, date: '10/05/2026' },
  ]);

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title) return;

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      
      // Adiciona na lista
      const newCamp = {
        id: campaigns.length + 1,
        title: campaignForm.title,
        channel: campaignForm.channel,
        segment: campaignForm.segment === 'inativos' ? 'Contatos Inativos > 30d' :
                 campaignForm.segment === 'frotistas' ? 'Frotistas Sorocaba' : 'Seminovos / Usados',
        status: 'active',
        reach: Math.floor(Math.random() * 200) + 50,
        date: new Date().toLocaleDateString('pt-BR')
      };

      setCampaigns([newCamp, ...campaigns]);

      // Mostra Toast
      setSuccessToast({
        show: true,
        title: 'Disparo Efetuado com Sucesso',
        desc: `Campanha "${campaignForm.title}" foi agendada e enviada para processamento da fila de IA.`
      });

      // Limpa formulário
      setCampaignForm({
        title: '',
        channel: 'email',
        segment: 'inativos',
        aiTone: 'formal',
        customSubject: '',
        customBody: ''
      });

      // Auto-hide Toast
      setTimeout(() => {
        setSuccessToast(prev => ({ ...prev, show: false }));
      }, 5000);

    }, 1500);
  };

  return (
    <div className="space-y-6 relative pb-12">
      
      {/* Toast flutuante de sucesso interno */}
      {successToast.show && (
        <div className="fixed bottom-6 right-6 bg-card border-l-4 border-emerald-500 shadow-2xl p-4 rounded-r-xl max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-emerald-500/10 rounded-full text-emerald-500">
              <Check size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">{successToast.title}</h4>
              <p className="text-[10px] text-foreground/60 mt-1 leading-relaxed">{successToast.desc}</p>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automação de Marketing</h2>
          <p className="text-foreground/60 mt-1">Gere leads quentes e reative contatos utilizando automação de e-mail e WhatsApp.</p>
        </div>
      </header>

      {/* Grid de Performance de Marketing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Alcance Global</h3>
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Users size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">847 contatos</p>
          <span className="text-[10px] text-foreground/45 mt-1 block">Leads ativos na base segmentada</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Média de Abertura</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Sparkles size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">62.8%</p>
          <span className="text-[10px] text-green-500 font-bold flex items-center mt-1">
            +5.4% acima da média MB
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Reatividade IA</h3>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Award size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">18.4%</p>
          <span className="text-[10px] text-foreground/45 mt-1 block">Contatos inativos que responderam</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground/60 font-medium text-xs uppercase tracking-wider">Canais Ativos</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Megaphone size={16}/></div>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">WhatsApp & E-mail</p>
          <span className="text-[10px] text-foreground/45 mt-1 block">Disparadores transacionais homologados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel do Criador de Campanhas */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <form onSubmit={handleLaunchCampaign} className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-border pb-3 mb-4">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-bold text-sm">Disparador de Campanhas IA</h3>
            </div>
            <p className="text-xs text-foreground/50 mb-4">Crie disparos em lote com personalização nativa e tom de escrita por inteligência artificial.</p>

            <div>
              <label className="text-xs font-semibold text-foreground/75 block mb-1">Título da Campanha *</label>
              <input
                type="text"
                required
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                placeholder="Ex: Oferta Renovação Actros 2548"
                className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Canal</label>
                <select
                  value={campaignForm.channel}
                  onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}
                  className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs font-medium cursor-pointer"
                >
                  <option value="email">📧 E-mail Corporativo</option>
                  <option value="whatsapp">💬 WhatsApp MB</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/75 block mb-1">Público-Alvo</label>
                <select
                  value={campaignForm.segment}
                  onChange={(e) => setCampaignForm({ ...campaignForm, segment: e.target.value })}
                  className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs font-medium cursor-pointer"
                >
                  <option value="inativos">Contatos Inativos (+30d)</option>
                  <option value="frotistas">Frotistas Região Sorocaba</option>
                  <option value="seminovos">Interesse em Seminovos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/75 block mb-1">Tom da Escrita (Inteligência Comercial)</label>
              <select
                value={campaignForm.aiTone}
                onChange={(e) => setCampaignForm({ ...campaignForm, aiTone: e.target.value })}
                className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs font-medium cursor-pointer"
              >
                <option value="formal">👔 Corporativo Mercedes-Benz (Formal)</option>
                <option value="venda">🔥 Conversão Rápida / Vendas Agressivo</option>
                <option value="relacionamento">🤝 Cortês / Relacionamento e Follow-up</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/75 block mb-1">Assunto do Disparo</label>
              <input
                type="text"
                value={campaignForm.customSubject}
                onChange={(e) => setCampaignForm({ ...campaignForm, customSubject: e.target.value })}
                placeholder="Ex: Condição Especial de Renovação de Frota - De Nigris"
                className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/75 block mb-1">Texto Principal</label>
              <textarea
                rows={3}
                value={campaignForm.customBody}
                onChange={(e) => setCampaignForm({ ...campaignForm, customBody: e.target.value })}
                placeholder="Insira detalhes da oferta ou deixe em branco para que a IA crie o corpo completo utilizando as especificações do público."
                className="w-full bg-background border border-border rounded p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded text-xs transition-colors flex items-center justify-center space-x-2 shadow cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{loading ? 'Disparando Fila IA...' : 'Disparar Campanha'}</span>
            </button>
          </form>
        </div>

        {/* Listagem de Campanhas Ativas e Planejadas */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-border pb-3 mb-4">
              <Megaphone size={18} className="text-primary" />
              <h3 className="font-bold text-sm">Registro de Disparos e Automações</h3>
            </div>
            <p className="text-xs text-foreground/50 mb-4">Status de transmissão de campanhas e taxas de engajamento do funil de marketing.</p>

            <div className="space-y-3.5">
              {campaigns.map((camp) => (
                <div key={camp.id} className="border border-border/80 bg-background/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-lg border ${
                      camp.channel === 'whatsapp' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                    }`}>
                      {camp.channel === 'whatsapp' ? <MessageSquare size={16} /> : <Mail size={16} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{camp.title}</h4>
                      <p className="text-[10px] text-foreground/50 mt-1 flex items-center">
                        <Users size={10} className="mr-1" /> Público: {camp.segment} 
                        <span className="mx-2">•</span> 
                        <Calendar size={10} className="mr-1" /> Data: {camp.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground block">{camp.reach} disparos</span>
                      <span className="text-[9px] text-foreground/45 mt-0.5 block">Total atingidos</span>
                    </div>
                    <div>
                      {camp.status === 'active' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse">
                          Transmitindo
                        </span>
                      )}
                      {camp.status === 'scheduled' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Agendada
                        </span>
                      )}
                      {camp.status === 'completed' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-foreground/5 text-foreground/60 border border-foreground/10">
                          Concluída
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-6 bg-foreground/[0.01] p-3 rounded-lg flex items-center space-x-2">
            <ShieldAlert size={14} className="text-primary/75 shrink-0" />
            <p className="text-[10px] text-foreground/60 leading-relaxed">
              Todos os disparos respeitam estritamente a LGPD. Contatos que solicitarem remoção são automaticamente excluídos dos blocos de automação pelo robô integrador do CRM.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
