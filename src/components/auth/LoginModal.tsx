import React, { useState } from 'react';
import {
  Scissors,
  Shield,
  Lock,
  Mail,
  Key,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { UserRole, Organization } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: UserRole, org?: Organization) => void;
  onOpenRegister?: () => void;
  initialTab?: 'OWNER' | 'SUPER_ADMIN';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenRegister,
  initialTab = 'OWNER',
}) => {
  const [activeTab, setActiveTab] = useState<'OWNER' | 'SUPER_ADMIN'>(initialTab);

  // Owner Form
  const [ownerEmailOrSlug, setOwnerEmailOrSlug] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  // Super Admin Form
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isConfiguringNewPass, setIsConfiguringNewPass] = useState(false);
  const [newCustomPass, setNewCustomPass] = useState('');
  const [passSavedNotice, setPassSavedNotice] = useState('');

  // Error & Loading
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleOwnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!ownerEmailOrSlug.trim() || !ownerPassword.trim()) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = StorageService.loginOwner(ownerEmailOrSlug, ownerPassword);
      setIsLoading(false);
      if (result.success && result.organization) {
        onSuccess('OWNER', result.organization);
        onClose();
      } else {
        setErrorMsg(result.error || 'Credenciais inválidas. Verifique seu login e senha.');
      }
    }, 400);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!adminPassword.trim()) {
      setErrorMsg('Por favor, informe a senha do Super Admin.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = StorageService.loginSuperAdmin(adminPassword);
      setIsLoading(false);
      if (result.success) {
        onSuccess('SUPER_ADMIN');
        onClose();
      } else {
        setErrorMsg(result.error || 'Senha do Super Admin incorreta.');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 mb-3">
            <Scissors className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Acessar o BarberOS</h2>
          <p className="text-xs text-slate-400 mt-1">
            Entre na sua conta para gerenciar seu salão ou acessar a plataforma
          </p>
        </div>

        {/* Tab Selector: Dono da Barbearia vs Super Admin */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('OWNER');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'OWNER'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors className="h-4 w-4" />
            <span>Dono de Barbearia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SUPER_ADMIN');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'SUPER_ADMIN'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Dono da SaaS (Admin)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: OWNER LOGIN */}
        {activeTab === 'OWNER' && (
          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                E-mail ou Usuário do Salão *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerEmailOrSlug}
                  onChange={(e) => setOwnerEmailOrSlug(e.target.value)}
                  placeholder="Ex: dono@barbearia.com ou barbearia"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Senha *</label>
                <span className="text-[10px] text-slate-500">Padrão inicial: 123</span>
              </div>
              <div className="relative">
                <input
                  type={showOwnerPassword ? 'text' : 'password'}
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5"
                >
                  {showOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Entrando...' : 'Entrar no Painel da Barbearia'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Quick Helper */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 text-center">
              <p className="text-[11px] text-slate-400">
                Conta padrão: <strong className="text-amber-300">dono@barbearia.com</strong> | Senha: <strong className="text-amber-300">123</strong>
              </p>
            </div>

            {onOpenRegister && (
              <div className="text-center pt-2 border-t border-slate-800/80">
                <p className="text-xs text-slate-400">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRegister();
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Cadastrar Meu Salão Grátis
                  </button>
                </p>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: SUPER ADMIN LOGIN */}
        {activeTab === 'SUPER_ADMIN' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
              <span className="font-semibold block mb-0.5">Área do Dono da Plataforma SaaS</span>
              Acesso protegido por senha para conferir pagamentos de R$ 79,90, liberar estabelecimentos e gerenciar o sistema.
            </div>

            {passSavedNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{passSavedNotice}</span>
              </div>
            )}

            {!isConfiguringNewPass ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Sua Senha de Super Admin *</label>
                    <span className="text-[10px] text-slate-500">Padrão: admin123</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Digite a senha criada por você"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 font-mono"
                    />
                    <Key className="absolute left-3.5 top-3 h-4 w-4 text-purple-400" />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5"
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition disabled:opacity-50 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>{isLoading ? 'Verificando...' : 'Acessar Painel do Dono da SaaS'}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Deseja criar uma nova senha?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfiguringNewPass(true);
                      setErrorMsg('');
                    }}
                    className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                  >
                    Definir Nova Senha Criada por Mim
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCustomPass.trim()) return;
                  StorageService.updateSuperAdminPassword(newCustomPass.trim());
                  setPassSavedNotice(`Nova senha criada com sucesso! Você já está autenticado.`);
                  setTimeout(() => {
                    onSuccess('SUPER_ADMIN');
                    onClose();
                  }, 1200);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nova Senha Criada por Você *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomPass}
                    onChange={(e) => setNewCustomPass(e.target.value)}
                    placeholder="Digite sua senha desejada para o Super Admin"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-purple-300 font-mono focus:outline-hidden focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Esta senha será gravada e exigida para acessar o painel global do Dono da SaaS.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfiguringNewPass(false)}
                    className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-750 py-2.5 text-xs font-semibold text-slate-300"
                  >
                    Voltar ao Login
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30"
                  >
                    Salvar e Entrar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
