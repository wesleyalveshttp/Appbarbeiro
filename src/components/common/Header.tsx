import React, { useState } from 'react';
import {
  Scissors,
  Building2,
  UserCheck,
  Shield,
  QrCode,
  Share2,
  Menu,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Plus,
  CreditCard,
  LogIn,
  LogOut
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Professional } from '../../types';
import { NotificationBell } from './NotificationBell';
import { QRCodeModal } from './QRCodeModal';
import { getPublicBaseUrl } from '../../utils/publicUrl';

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
  onNavigateToQueue,
  onNavigateToBooking,
  onNavigateToStore,
}) => {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrType, setQrType] = useState<'booking' | 'queue' | 'store'>('booking');

  const allOrgs = StorageService.getAllOrganizations();
  const professionals = StorageService.getProfessionals(currentOrg.id);

  const getQRData = () => {
    const origin = getPublicBaseUrl(currentOrg);
    const orgSlug = (currentOrg?.slug || '').trim();
    const salonName = currentOrg?.name || 'Seu Salão';
    if (qrType === 'booking') {
      return {
        title: 'Agendamento Online',
        subtitle: `Link e QR Code exclusivo para clientes de ${salonName}`,
        url: `${origin}/agendar/${orgSlug}`,
      };
    }
    if (qrType === 'queue') {
      return {
        title: 'Fila de Espera Digital',
        subtitle: `Link e QR Code exclusivo da fila de ${salonName}`,
        url: `${origin}/fila/${orgSlug}`,
      };
    }
    return {
      title: 'Página Pública do Salão',
      subtitle: `Vitrine digital e catálogo exclusivo de ${salonName}`,
      url: `${origin}/b/${orgSlug}`,
    };
  };

  const qrData = getQRData();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-md">
        {/* Left Side: Mobile Menu toggle + Logo + Org Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-md shadow-amber-500/10">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white group-hover:text-amber-400 transition">
                  BarberOS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  SaaS
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block mx-1" />

          {/* Organization Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-850 transition"
            >
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentOrg.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showOrgDropdown && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Estabelecimentos (Multi-tenant)
                </div>
                {allOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      onSelectOrg(org);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                      org.id === currentOrg.id ? 'text-amber-400 font-semibold bg-amber-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{org.type}</span>
                  </button>
                ))}
                <div className="border-t border-slate-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowOrgDropdown(false);
                      onOpenOnboarding();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Cadastrar Novo Salão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Role Switcher Demo Bar + Action Buttons + Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick QR Share Buttons */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => {
                setQrType('booking');
                setShowQRModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition"
              title="QR Code Agendamento"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span>QR Agendamento</span>
            </button>
            <button
              onClick={() => {
                setQrType('queue');
                setShowQRModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition"
              title="QR Code Fila de Espera"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-400" />
              <span>QR Fila</span>
            </button>
          </div>

          {/* Role Mode Simulator Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-slate-850 transition"
            >
              {currentRole === 'SUPER_ADMIN' && <Shield className="h-3.5 w-3.5 text-purple-400" />}
              {currentRole === 'OWNER' && <UserCheck className="h-3.5 w-3.5 text-amber-400" />}
              {currentRole === 'PROFESSIONAL' && <Scissors className="h-3.5 w-3.5 text-blue-400" />}
              {currentRole === 'CLIENT' && <Sparkles className="h-3.5 w-3.5 text-emerald-400" />}
              
              <span className="hidden sm:inline">Modo:</span>
              <span>
                {currentRole === 'SUPER_ADMIN' && 'Super Admin'}
                {currentRole === 'OWNER' && 'Dono / Gerente'}
                {currentRole === 'PROFESSIONAL' && `Barbeiro (${selectedProfessional?.name.split(' ')[0] || 'Profissional'})`}
                {currentRole === 'CLIENT' && 'Visão do Cliente'}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  Simular Nível de Acesso (RBAC)
                </div>
                <button
                  onClick={() => {
                    onChangeRole('OWNER');
                    setShowRoleDropdown(false);
                    onNavigate('dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition ${
                    currentRole === 'OWNER' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-300'
                  }`}
                >
                  <UserCheck className="h-4 w-4 text-amber-400" />
                  <div>
                    <div>Dono / Administrador</div>
                    <div className="text-[10px] text-slate-500 font-normal">Acesso completo: gestão, financeiro e fila</div>
                  </div>
                </button>

                {professionals.length > 0 && (
                  <div className="border-t border-slate-800/80 my-1 pt-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                      Como Barbeiro / Profissional:
                    </div>
                    {professionals.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onChangeRole('PROFESSIONAL', p.id);
                          setShowRoleDropdown(false);
                          onNavigate('operacional');
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800 transition ${
                          currentRole === 'PROFESSIONAL' && selectedProfessional?.id === p.id
                            ? 'text-blue-400 font-bold bg-blue-500/10'
                            : 'text-slate-300'
                        }`}
                      >
                        <Scissors className="h-3.5 w-3.5 text-blue-400" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-800/80 my-1 pt-1">
                  <button
                    onClick={() => {
                      onChangeRole('CLIENT');
                      setShowRoleDropdown(false);
                      onNavigate('client-portal');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition ${
                      currentRole === 'CLIENT' ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-300'
                    }`}
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <div>
                      <div>Portal do Cliente</div>
                      <div className="text-[10px] text-slate-500 font-normal">Ver agendamentos e fila do cliente</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onChangeRole('SUPER_ADMIN');
                      setShowRoleDropdown(false);
                      onNavigate('superadmin');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition ${
                      currentRole === 'SUPER_ADMIN' ? 'text-purple-400 font-bold bg-purple-500/10' : 'text-slate-300'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-purple-400" />
                    <div>
                      <div>Super Admin do SaaS</div>
                      <div className="text-[10px] text-slate-500 font-normal">Todos os salões, planos e métricas globais</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <NotificationBell organizationId={currentOrg.id} />

          {/* Subscription Status Badge / Button */}
          <button
            onClick={() => onNavigate('assinatura')}
            className={`hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
              currentOrg.subscription?.status === 'ATIVA'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : currentOrg.subscription?.status === 'AGUARDANDO_APROVACAO'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                : currentOrg.subscription?.status === 'TESTE_GRATIS'
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 animate-pulse'
            }`}
            title="Gerenciar Assinatura de R$ 79,90"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>
              {currentOrg.subscription?.status === 'ATIVA'
                ? 'Pro Ativo (R$ 79,90)'
                : currentOrg.subscription?.status === 'AGUARDANDO_APROVACAO'
                ? 'Aguardando Aprovação Dono'
                : currentOrg.subscription?.status === 'TESTE_GRATIS'
                ? 'Testes (R$ 79,90/mês)'
                : 'Ativar Pro R$ 79,90'}
            </span>
          </button>

          {/* SaaS Owner Quick Access Button */}
          {currentRole !== 'SUPER_ADMIN' && (
            <button
              onClick={() => {
                if (StorageService.isSuperAdminAuthenticated()) {
                  onChangeRole('SUPER_ADMIN');
                  onNavigate('superadmin');
                } else if (onOpenLogin) {
                  onOpenLogin('SUPER_ADMIN');
                } else {
                  onChangeRole('SUPER_ADMIN');
                  onNavigate('superadmin');
                }
              }}
              className="hidden xl:flex items-center gap-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/40 px-2.5 py-1.5 text-xs text-purple-200 font-semibold transition cursor-pointer"
              title="Painel do Dono da SaaS: Liberação de Pagamentos (R$ 79,90)"
            >
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              <span>Dono da SaaS (Aprovações)</span>
            </button>
          )}

          {/* Login / Trocar Conta */}
          {onOpenLogin && (
            <button
              onClick={() => onOpenLogin('OWNER')}
              className="hidden md:flex items-center gap-1 rounded-lg text-slate-300 hover:text-white px-2.5 py-1.5 text-xs border border-slate-800 hover:border-slate-750 hover:bg-slate-850 transition cursor-pointer"
              title="Fazer Login ou Trocar de Conta"
            >
              <LogIn className="h-3.5 w-3.5 text-amber-400" />
              <span>Login</span>
            </button>
          )}

          {/* Quick link to public page */}
          <a
            href={`/b/${currentOrg.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 transition"
            title="Ver Página Pública"
          >
            <span>Página Pública</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          {/* Link back to Landing page on PC */}
          <button
            onClick={() => onNavigate('landing')}
            className="hidden lg:flex items-center gap-1 rounded-lg text-slate-400 hover:text-white px-2 py-1.5 text-xs transition cursor-pointer"
            title="Ver Landing Page do BarberOS"
          >
            <span>Landing Page</span>
          </button>

          {/* Sair / Logout */}
          <button
            onClick={() => {
              StorageService.logout();
              onNavigate('landing');
            }}
            className="flex items-center gap-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 text-xs transition cursor-pointer border border-rose-500/20"
            title="Sair da Conta"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title={qrData.title}
        subtitle={qrData.subtitle}
        url={qrData.url}
        establishmentName={currentOrg.name}
        onNavigateDirectly={() => {
          setShowQRModal(false);
          if (qrType === 'booking') {
            onNavigateToBooking?.(currentOrg.slug);
          } else if (qrType === 'store') {
            onNavigateToStore?.(currentOrg.slug);
          } else {
            onNavigateToQueue?.(currentOrg.slug);
          }
        }}
      />
    </>
  );
};
