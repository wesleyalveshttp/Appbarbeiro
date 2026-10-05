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
  HelpCircle,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { UserRole } from '../../types';

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
        { id: 'operacional', label: 'Modo Barbearia', icon: Armchair, highlight: true },
        { id: 'agenda', label: 'Minha Agenda', icon: Calendar },
        { id: 'fila', label: 'Fila de Espera', icon: Clock },
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
      { id: 'operacional', label: 'Modo Barbearia', icon: Armchair, badge: 'Ao Vivo', highlight: true },
      { id: 'agenda', label: 'Agenda & Horários', icon: Calendar },
      { id: 'fila', label: 'Fila Digital', icon: Clock, badge: 'Tempo Real' },
      { id: 'clientes', label: 'Clientes (CRM)', icon: Users },
      { id: 'profissionais', label: 'Profissionais & Comissões', icon: Scissors },
      { id: 'servicos', label: 'Serviços & Preços', icon: Sparkles },
      { id: 'financeiro', label: 'Financeiro & Caixa', icon: DollarSign },
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
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-3 mb-2 border-b border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {currentRole === 'SUPER_ADMIN' ? 'SaaS Master Admin' : orgName}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition group ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/5 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
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
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
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
            onClick={() => handleSelect('landing')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span>Ver Landing Page</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-600" />
          </button>
        </div>
      </aside>
    </>
  );
};
