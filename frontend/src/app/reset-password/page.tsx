'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de recuperação ausente. Por favor, solicite um novo link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    const isSuccess = await api.resetPassword(token, password);
    setLoading(false);

    if (isSuccess) {
      setSuccess(true);
      setTimeout(() => {
        // Redireciona para o login apagando o /reset-password da url
        window.location.href = '/';
      }, 3000);
    } else {
      setError('O token expirou ou é inválido. Por favor, solicite um novo link de recuperação.');
    }
  };

  return (
    <div className="min-h-screen bg-[#040914] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[25rem] h-[25rem] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md bg-card/45 border border-border/40 backdrop-blur-xl p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[#0B1C3F] rounded-2xl border border-primary/20 flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Redefinir Senha</h1>
          <p className="text-sm text-slate-400 mt-2 text-center">
            Crie uma nova senha segura para acessar o CRM Vendas De Nigris.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-400 font-bold mb-1">Senha atualizada com sucesso!</p>
              <p className="text-xs text-slate-300">Você será redirecionado para o login em instantes...</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-primary hover:bg-primary/95 text-white font-semibold py-3 rounded-xl transition-all shadow-lg"
            >
              Ir para o Login Agora
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Nova Senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#080e1c]/80 border border-border/40 rounded-xl py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-sm"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Confirmar Senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#080e1c]/80 border border-border/40 rounded-xl py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-sm"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-primary hover:bg-primary/95 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 mt-4"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#040914] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-sm text-slate-400">Carregando ambiente seguro...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
