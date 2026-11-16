import React, { useState, useEffect, useRef } from 'react';
import {
  Scissors,
  Building2,
  UserCheck,
  Shield,
  Menu,
  ChevronDown,
  Sparkles,
  Plus,
  CreditCard,
  LogOut
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Professional } from '../../types';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  currentOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  currentRole: 'SUPER_ADMIN' | 'OWNER' | 'PROFESSIONAL' | 'CLIENT';
  onChangeRole: (role: 'SUPER_ADMIN' | 'OWNER' | 'PROFESSIONAL' | 'CLIENT', professionalId?: string) => void;
  selectedProfessional?: Professional;
  onToggleMobileMenu: () => void;
  onOpenOnboarding: () => void;
  onNavigate: (route: string) => void;
  onOpenLogin?: (tab?: 'OWNER' | 'SUPER_ADMIN') => void;
  onNavigateToQueue?: (slug: string) => void;
  onNavigateToBooking?: (slug: string) => void;
  onNavigateToStore?: (slug: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentOrg,
  onSelectOrg,
  currentRole,
  onChangeRole,
  selectedProfessional,
  onToggleMobileMenu,
  onOpenOnboarding,
  onNavigate,
  onOpenLogin,
}) => {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentRole === 'SUPER_ADMIN' || StorageService.isSuperAdminAuthenticated();
  const allOrgs = StorageService.getAllOrganizations();
  const professionals = StorageService.getProfessionals(currentOrg.id);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subStatus = currentOrg.subscription?.status;

  const getPlanBadgeMeta = () => {
    if (subStatus === 'ATIVA') {
      return {
        label: 'Plano Pro Ativo',
        classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20',
      };
    }
    if (subStatus === 'AGUARDANDO_APROVACAO') {
      return {
        label: 'Aprovação Pendente',
        classes: 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20',
      };
    }
    if (subStatus === 'TESTE_GRATIS') {
      return {
        label: 'Plano Teste Grátis',
        classes: 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800',
      };
    }
    return {
      label: 'Ativar Plano Pro',
      classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
    };
  };

  const planBadge = getPlanBadgeMeta();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-slate-800/90 bg-slate-950/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Element (1/4): Mobile Sidebar Trigger + Establishment Selector */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Abrir menu lateral"
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition shrink-0 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Establishment Switcher */}
        <div className="relative" ref={orgDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowOrgDropdown(!showOrgDropdown);
              setShowRoleDropdown(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer"
          >
            <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="max-w-[140px] sm:max-w-[220px] truncate">{currentOrg.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>

          {showOrgDropdown && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800/80">
                Estabelecimentos
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {allOrgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      onSelectOrg(org);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                      org.id === currentOrg.id ? 'text-amber-400 font-semibold bg-amber-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2 shrink-0">{org.type}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowOrgDropdown(false);
                    onOpenOnboarding();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Cadastrar Novo Salão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Elements (2, 3, 4): Role Switcher, Notifications Bell, Plan Badge, Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Conditional Super Admin quick access ONLY if logged-in user has isSuperAdmin === true */}
        {isSuperAdmin && currentRole !== 'SUPER_ADMIN' && (
          <button
            type="button"
            onClick={() => {
              if (StorageService.isSuperAdminAuthenticated()) {
                onChangeRole('SUPER_ADMIN');
                onNavigate('superadmin');
              } else if (onOpenLogin) {
                onOpenLogin('SUPER_ADMIN');
              }
            }}
            className="hidden xl:flex items-center gap-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/40 px-2.5 py-1.5 text-xs text-purple-200 font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            title="Painel do Dono da SaaS"
          >
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span>Super Admin</span>
          </button>
        )}

        {/* Role Switcher */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowOrgDropdown(false);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap"
          >
            {currentRole === 'SUPER_ADMIN' && <Shield className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
            {currentRole === 'OWNER' && <UserCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
            {currentRole === 'PROFESSIONAL' && <Scissors className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
            {currentRole === 'CLIENT' && <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}

            <span className="hidden md:inline text-slate-400 font-normal">Modo:</span>
            <span className="max-w-[110px] sm:max-w-none truncate">
              {currentRole === 'SUPER_ADMIN' && 'Super Admin'}
              {currentRole === 'OWNER' && 'Dono / Gerente'}
              {currentRole === 'PROFESSIONAL' && `Barbeiro (${selectedProfessional?.name.split(' ')[0] || 'Equipe'})`}
              {currentRole === 'CLIENT' && 'Cliente'}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                Alternar Perfil de Visão
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeRole('OWNER');
                  setShowRoleDropdown(false);
                  onNavigate('dashboard');
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer ${
                  currentRole === 'OWNER' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-300'
                }`}
              >
                <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <div>Dono / Gerente</div>
                  <div className="text-[10px] text-slate-500 font-normal">Acesso completo: gestão, financeiro e fila</div>
                </div>
              </button>

              {professionals.length > 0 && (
                <div className="border-t border-slate-800/80 my-1 pt-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                    Visão do Barbeiro
                  </div>
                  {professionals.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChangeRole('PROFESSIONAL', p.id);
                        setShowRoleDropdown(false);
                        onNavigate('operacional');
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer ${
                        currentRole === 'PROFESSIONAL' && selectedProfessional?.id === p.id
                          ? 'text-blue-400 font-bold bg-blue-500/10'
                          : 'text-slate-300'
                      }`}
                    >
                      <Scissors className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-800/80 my-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onChangeRole('CLIENT');
                    setShowRoleDropdown(false);
                    onNavigate('client-portal');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer ${
                    currentRole === 'CLIENT' ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-300'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <div>Visão do Cliente</div>
                    <div className="text-[10px] text-slate-500 font-normal">Acompanhar fila e agendamentos</div>
                  </div>
                </button>

                {/* Rendered strictly for authenticated Super Admins */}
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeRole('SUPER_ADMIN');
                      setShowRoleDropdown(false);
                      onNavigate('superadmin');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer ${
                      currentRole === 'SUPER_ADMIN' ? 'text-purple-400 font-bold bg-purple-500/10' : 'text-slate-300'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-purple-400 shrink-0" />
                    <div>
                      <div>Super Admin do SaaS</div>
                      <div className="text-[10px] text-slate-500 font-normal">Estabelecimentos, planos e aprovações</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <NotificationBell organizationId={currentOrg.id} />

        {/* Discrete Plan Badge */}
        <button
          type="button"
          onClick={() => onNavigate('assinatura')}
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition whitespace-nowrap shrink-0 cursor-pointer ${planBadge.classes}`}
          title="Gerenciar Minha Assinatura"
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          <span>{planBadge.label}</span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => {
            StorageService.logout();
            onNavigate('landing');
          }}
          className="inline-flex items-center gap-1.5 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 sm:px-3 py-1.5 text-xs font-medium transition cursor-pointer border border-slate-800 hover:border-rose-500/30 whitespace-nowrap shrink-0"
          title="Sair da Conta"
        >
          <LogOut className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
};
