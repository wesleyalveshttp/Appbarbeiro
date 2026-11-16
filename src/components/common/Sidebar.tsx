import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Armchair,
  Users,
  Scissors,
  Sparkles,
  DollarSign,
  BarChart3,
  Star,
  Settings,
  Shield,
  QrCode,
  Globe,
  LogOut,
  ChevronRight,
  CreditCard,
  X
} from 'lucide-react';
import { UserRole } from '../../types';
import { StorageService } from '../../services/storage';

interface SidebarProps {
  currentRole: UserRole;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  orgName: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeTone?: 'amber' | 'emerald' | 'neutral';
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  orgName,
}) => {
  // Navigation menus based on Role
  const getNavItems = (): NavItem[] => {
    if (currentRole === 'SUPER_ADMIN') {
      return [
        { id: 'superadmin', label: 'Painel Geral SaaS', icon: Shield },
        { id: 'superadmin-orgs', label: 'Estabelecimentos', icon: LayoutDashboard },
        { id: 'superadmin-plans', label: 'Planos & Assinaturas', icon: DollarSign },
        { id: 'superadmin-logs', label: 'Logs de Auditoria', icon: BarChart3 },
        { id: 'landing', label: 'Landing Page Comercial', icon: Globe },
      ];
    }

    if (currentRole === 'PROFESSIONAL') {
      return [
        { id: 'operacional', label: 'Modo Barbearia', icon: Armchair, badge: 'AO VIVO', badgeTone: 'amber', highlight: true },
        { id: 'agenda', label: 'Minha Agenda', icon: Calendar },
        { id: 'fila', label: 'Fila de Espera', icon: Clock, badge: 'TEMPO REAL', badgeTone: 'emerald' },
        { id: 'clientes', label: 'Meus Clientes', icon: Users },
        { id: 'relatorios', label: 'Minhas Comissões', icon: BarChart3 },
      ];
    }

    if (currentRole === 'CLIENT') {
      return [
        { id: 'client-portal', label: 'Meus Agendamentos', icon: Calendar },
        { id: 'fila', label: 'Acompanhar Fila', icon: Clock },
        { id: 'landing', label: 'Sobre a Plataforma', icon: Globe },
      ];
    }

    // Default: OWNER / ADMIN
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'operacional', label: 'Modo Barbearia', icon: Armchair, badge: 'AO VIVO', badgeTone: 'amber', highlight: true },
      { id: 'agenda', label: 'Agenda & Horários', icon: Calendar },
      { id: 'fila', label: 'Fila Digital', icon: Clock, badge: 'TEMPO REAL', badgeTone: 'emerald' },
      { id: 'clientes', label: 'Clientes (CRM)', icon: Users },
      { id: 'profissionais', label: 'Profissionais & Comissões', icon: Scissors },
      { id: 'servicos', label: 'Serviços & Preços', icon: Sparkles },
      { id: 'financeiro', label: 'Financeiro & Caixa', icon: DollarSign },
      { id: 'assinatura', label: 'Minha Assinatura', icon: CreditCard, badge: 'Pro', badgeTone: 'neutral' },
      { id: 'relatorios', label: 'Relatórios & DRE', icon: BarChart3 },
      { id: 'avaliacoes', label: 'Avaliações', icon: Star },
      { id: 'qrcodes', label: 'Links & QR Codes', icon: QrCode },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  const handleSelect = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 md:z-20 w-64 border-r border-slate-800/90 bg-slate-950 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Brand & Establishment Header inside Sidebar */}
          <div className="flex items-center justify-between gap-2 px-2.5 pb-3.5 mb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 shadow-sm">
                <Scissors className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold tracking-tight text-white leading-none">
                  BarberOS
                </div>
                <div className="text-[11px] font-medium text-slate-400 truncate mt-1">
                  {currentRole === 'SUPER_ADMIN' ? 'Administração SaaS' : orgName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;

            const badgeClasses =
              item.badgeTone === 'amber'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : item.badgeTone === 'neutral'
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition group cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/12 text-amber-400 font-semibold border border-amber-500/25'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/5 hover:text-white border border-transparent'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive
                        ? 'text-amber-400'
                        : item.highlight
                        ? 'text-amber-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 ${badgeClasses}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <button
            type="button"
            onClick={() => handleSelect('landing')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span>Ver Site Comercial</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-600" />
          </button>

          <button
            type="button"
            onClick={() => {
              StorageService.logout();
              handleSelect('landing');
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-rose-400" />
              <span>Sair da Conta</span>
            </div>
            <ChevronRight className="h-3 w-3 text-rose-400/60" />
          </button>
        </div>
      </aside>
    </>
  );
};
