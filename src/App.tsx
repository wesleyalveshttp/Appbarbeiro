import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from './services/storage';
import { Organization, Professional, UserRole, AuthSession } from './types';
import { CreditCard, Sparkles, Scissors } from 'lucide-react';

// Common Layout Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { GlobalModals } from './components/common/GlobalModals';
import { SubscriptionPaywallGate } from './components/common/SubscriptionPaywallGate';

// Admin / Dashboard Views
import { OwnerDashboard } from './components/admin/OwnerDashboard';
import { OperationalBoard } from './components/admin/OperationalBoard';
import { AgendaView } from './components/admin/AgendaView';
import { QueueManagement } from './components/admin/QueueManagement';
import { CustomersView } from './components/admin/CustomersView';
import { ProfessionalsView } from './components/admin/ProfessionalsView';
import { ServicesView } from './components/admin/ServicesView';
import { FinancialView } from './components/admin/FinancialView';
import { SubscriptionView } from './components/admin/SubscriptionView';
import { SubscriptionCheckoutModal } from './components/admin/SubscriptionCheckoutModal';
import { ReportsView } from './components/admin/ReportsView';
import { ReviewsView } from './components/admin/ReviewsView';
import { SettingsView } from './components/admin/SettingsView';
import { QRCodesView } from './components/admin/QRCodesView';
import { OnboardingWizard } from './components/admin/OnboardingWizard';

// Super Admin & Client Portal
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { ClientPortal } from './components/client/ClientPortal';

// Public Pages
import { LandingPage } from './components/public/LandingPage';
import { PublicBooking } from './components/public/PublicBooking';
import { PublicQueue } from './components/public/PublicQueue';
import { PublicStorefront } from './components/public/PublicStorefront';
import { PublicAppointmentTracker } from './components/public/PublicAppointmentTracker';
import { LoginModal } from './components/auth/LoginModal';

// Robust URL Parser that works for all formats (/fila/slug, #/fila/slug, ?fila=slug)
function parseRouteFromLocation(): {
  route: string;
  publicParams: {
    type: 'BOOKING' | 'QUEUE' | 'STORE' | 'TRACKER' | null;
    slug?: string;
    token?: string;
  };
} {
  if (typeof window === 'undefined') {
    return { route: 'landing', publicParams: { type: null } };
  }
  const path = window.location.pathname || '';
  const hash = window.location.hash || '';
  const search = new URLSearchParams(window.location.search || '');

  // 1. Path-based routing (e.g. /fila/slug, /agendar/slug, /b/slug, /atendimento/token)
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'fila') {
    const slug = parts[1] ? decodeURIComponent(parts[1]) : '';
    return { route: 'public-queue', publicParams: { type: 'QUEUE', slug } };
  }
  if (parts[0] === 'agendar') {
    const slug = parts[1] ? decodeURIComponent(parts[1]) : '';
    return { route: 'public-booking', publicParams: { type: 'BOOKING', slug } };
  }
  if (parts[0] === 'b') {
    const slug = parts[1] ? decodeURIComponent(parts[1]) : '';
    return { route: 'public-store', publicParams: { type: 'STORE', slug } };
  }
  if (parts[0] === 'atendimento' && parts[1]) {
    return { route: 'public-tracker', publicParams: { type: 'TRACKER', token: decodeURIComponent(parts[1]) } };
  }

  // 2. Hash-based routing (e.g. #/fila/slug)
  if (hash) {
    const hashClean = hash.replace(/^#\/?/, '');
    const hashParts = hashClean.split('/').filter(Boolean);
    if (hashParts[0] === 'fila') {
      const slug = hashParts[1] ? decodeURIComponent(hashParts[1]) : '';
      return { route: 'public-queue', publicParams: { type: 'QUEUE', slug } };
    }
    if (hashParts[0] === 'agendar') {
      const slug = hashParts[1] ? decodeURIComponent(hashParts[1]) : '';
      return { route: 'public-booking', publicParams: { type: 'BOOKING', slug } };
    }
    if (hashParts[0] === 'b') {
      const slug = hashParts[1] ? decodeURIComponent(hashParts[1]) : '';
      return { route: 'public-store', publicParams: { type: 'STORE', slug } };
    }
  }

  // 3. Query param routing (?fila=slug or ?route=fila&slug=slug)
  const qFila = search.get('fila');
  if (qFila) {
    return { route: 'public-queue', publicParams: { type: 'QUEUE', slug: decodeURIComponent(qFila) } };
  }
  const qRoute = search.get('route');
  const qSlug = search.get('slug');
  if (qRoute === 'fila') {
    return { route: 'public-queue', publicParams: { type: 'QUEUE', slug: qSlug ? decodeURIComponent(qSlug) : '' } };
  }
  if (qRoute === 'agendar') {
    return { route: 'public-booking', publicParams: { type: 'BOOKING', slug: qSlug ? decodeURIComponent(qSlug) : '' } };
  }

  const session = StorageService.getAuthSession();
  if (session.isAuthenticated) {
    return {
      route: session.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard',
      publicParams: { type: null }
    };
  }

  return { route: 'landing', publicParams: { type: null } };
}

export default function App() {
  const initialRouteInfo = useMemo(() => parseRouteFromLocation(), []);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(() => {
    try {
      const activeOrgId = StorageService.getCurrentOrgId();
      return StorageService.getOrganizationById(activeOrgId) || StorageService.getAllOrganizations()[0] || null;
    } catch {
      return null;
    }
  });
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [authSession, setAuthSession] = useState<AuthSession>(() => StorageService.getAuthSession());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>();
  const [currentRoute, setCurrentRoute] = useState<string>(initialRouteInfo.route);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Modals State
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isNewQueueOpen, setIsNewQueueOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginInitialTab, setLoginInitialTab] = useState<'OWNER' | 'SUPER_ADMIN'>('OWNER');

  // Path routing parsing (e.g. /agendar/dom-navalha, /fila/dom-navalha, /b/dom-navalha, /atendimento/token)
  const [publicRouteParams, setPublicRouteParams] = useState(initialRouteInfo.publicParams);

  // Initialize Organization & Session
  useEffect(() => {
    const parseUrl = () => {
      const parsed = parseRouteFromLocation();
      if (parsed.publicParams.type) {
        setPublicRouteParams(parsed.publicParams);
        setCurrentRoute(parsed.route);
        return;
      }

      const session = StorageService.getAuthSession();
      setAuthSession(session);
      if (session.isAuthenticated) {
        if (session.role === 'SUPER_ADMIN') {
          setCurrentRoute((prev) => (prev.startsWith('public-') ? prev : 'superadmin'));
          setCurrentRole('SUPER_ADMIN');
        } else {
          setCurrentRoute((prev) => (prev.startsWith('public-') ? prev : 'dashboard'));
          setCurrentRole('OWNER');
        }
      } else {
        setCurrentRoute((prev) => (prev.startsWith('public-') ? prev : 'landing'));
      }
    };

    parseUrl();

    const initApp = async () => {
      try {
        // 1. Sync with server backend first to load all registered accounts into local state
        const serverDb = await StorageService.syncWithServer();

        // 2. Restore and verify user session
        const session = await StorageService.restoreSession();
        if (session?.isAuthenticated) {
          setAuthSession(session);
          setCurrentRole(session.role);

          if (session.role === 'SUPER_ADMIN') {
            setCurrentRoute((prev) => (prev.startsWith('public-') ? prev : (prev === 'landing' ? 'superadmin' : prev)));
          } else {
            let org: Organization | undefined;
            if (session.organizationId) {
              org = StorageService.getOrganizationById(session.organizationId);
              if (!org) {
                try {
                  const orgRes = await fetch(`/api/organizations/${encodeURIComponent(session.organizationId)}`);
                  if (orgRes.ok) {
                    const orgData = await orgRes.json();
                    if (orgData?.organization) {
                      org = orgData.organization as Organization;
                      StorageService.upsertOrganization(org);
                    }
                  }
                } catch {}
              }
            }
            if (!org) {
              const orgId = StorageService.getCurrentOrgId();
              org = StorageService.getOrganizationById(orgId) || serverDb?.organizations?.find(o => o.id !== 'org-prime') || serverDb?.organizations?.[0] || StorageService.getAllOrganizations()[0];
            }
            if (org) {
              setCurrentOrg(org);
              StorageService.setCurrentOrgId(org.id);
            }
            setCurrentRoute((prev) => (prev.startsWith('public-') ? prev : (prev === 'landing' ? 'dashboard' : prev)));
          }
        } else {
          // Not logged in: pick current or registered account
          const orgId = StorageService.getCurrentOrgId();
          const org = StorageService.getOrganizationById(orgId) || serverDb?.organizations?.find(o => o.id !== 'org-prime') || serverDb?.organizations?.[0] || StorageService.getAllOrganizations()[0];
          if (org) {
            setCurrentOrg(org);
            StorageService.setCurrentOrgId(org.id);
          }
        }

        const roleInfo = StorageService.getCurrentRole();
        setCurrentRole(roleInfo.role);
        setSelectedProfessionalId(roleInfo.professionalId);
      } catch (err) {
        console.warn('initApp warning fallback:', err);
      }
    };

    initApp();

    const unsub = StorageService.subscribeToRealtimeEvents((event) => {
      if (event.type === 'AUTH_SESSION_CHANGED') {
        const session = event.payload;
        if (session) {
          setAuthSession(session);
        }
        if (session?.isAuthenticated) {
          setCurrentRole(session.role);
          if (session.organizationId) {
            const updatedOrg = StorageService.getOrganizationById(session.organizationId);
            if (updatedOrg) setCurrentOrg(updatedOrg);
          }
        }
      }

      if (
        event.type === 'SUBSCRIPTION_UPDATED' ||
        event.type === 'ORG_CHANGED' ||
        event.type === 'ORGANIZATION_UPDATED' ||
        event.type === 'ORGANIZATIONS_UPDATED' ||
        event.type === 'DB_SYNCED' ||
        event.type === 'METRICS_RESET'
      ) {
        const activeOrgId = StorageService.getCurrentOrgId();
        if (activeOrgId) {
          const updated = StorageService.getOrganizationById(activeOrgId);
          if (updated) setCurrentOrg({ ...updated });
        }
      }
    });

    window.addEventListener('popstate', parseUrl);

    return () => {
      unsub();
      window.removeEventListener('popstate', parseUrl);
    };
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setCurrentOrg(org);
    StorageService.setCurrentOrgId(org.id);
    const session = StorageService.getAuthSession();
    if (session?.isAuthenticated && session.role === 'OWNER') {
      const updatedSession: AuthSession = { ...session, organizationId: org.id };
      StorageService.setAuthSession(updatedSession);
      setAuthSession(updatedSession);
    }
  };

  const handleChangeRole = (role: UserRole, professionalId?: string) => {
    setCurrentRole(role);
    setSelectedProfessionalId(professionalId);
    StorageService.setCurrentRole(role, professionalId);
  };

  const handleNavigateToPublic = (type: 'QUEUE' | 'BOOKING' | 'STORE' | 'TRACKER', slugOrToken?: string) => {
    const slug = (slugOrToken || currentOrg?.slug || '').trim();
    if (type === 'QUEUE') {
      setPublicRouteParams({ type: 'QUEUE', slug });
      setCurrentRoute('public-queue');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', slug ? `/fila/${slug}` : '/fila');
      }
    } else if (type === 'BOOKING') {
      setPublicRouteParams({ type: 'BOOKING', slug });
      setCurrentRoute('public-booking');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', `/agendar/${slug}`);
      }
    } else if (type === 'STORE') {
      setPublicRouteParams({ type: 'STORE', slug });
      setCurrentRoute('public-store');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', `/b/${slug}`);
      }
    } else if (type === 'TRACKER') {
      setPublicRouteParams({ type: 'TRACKER', token: slug });
      setCurrentRoute('public-tracker');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', `/atendimento/${slug}`);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (route: string) => {
    if (route === 'public-queue') {
      handleNavigateToPublic('QUEUE');
      return;
    }
    if (route === 'public-booking') {
      handleNavigateToPublic('BOOKING');
      return;
    }
    setCurrentRoute(route);
    setPublicRouteParams({ type: null });
    if (typeof window !== 'undefined' && window.history && (window.location.pathname.startsWith('/fila') || window.location.pathname.startsWith('/agendar') || window.location.pathname.startsWith('/b/'))) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = (tab: 'OWNER' | 'SUPER_ADMIN' = 'OWNER') => {
    setLoginInitialTab(tab);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (role: UserRole, org?: Organization) => {
    const session = StorageService.getAuthSession();
    setAuthSession(session);
    if (role === 'SUPER_ADMIN') {
      handleChangeRole('SUPER_ADMIN');
      handleNavigate('superadmin');
    } else if (org) {
      handleSelectOrg(org);
      handleChangeRole('OWNER');
      handleNavigate('dashboard');
    } else {
      handleChangeRole('OWNER');
      handleNavigate('dashboard');
    }
    setIsLoginModalOpen(false);
  };

  const handleOnboardingSuccess = (newOrg: Organization) => {
    setCurrentOrg(newOrg);
    StorageService.setCurrentOrgId(newOrg.id);
    const session: AuthSession = {
      isAuthenticated: true,
      uid: `usr_owner_${newOrg.id}`,
      userId: `usr_owner_${newOrg.id}`,
      role: 'OWNER',
      organizationId: newOrg.id,
      userEmail: newOrg.ownerEmail || `${newOrg.slug}@barberos.app`,
      userName: newOrg.ownerName || newOrg.name,
      loggedAt: new Date().toISOString()
    };
    StorageService.setAuthSession(session);
    setAuthSession(session);
    setIsOnboardingOpen(false);
    setCurrentRoute('dashboard');
    setCurrentRole('OWNER');
  };

  const handleLogout = async () => {
    await StorageService.logout();
    setAuthSession({ isAuthenticated: false, uid: 'guest', role: 'OWNER' });
    setCurrentRoute('landing');
    setCurrentRole('OWNER');
  };

  // 1. Render Public Direct Route Overlays (Guaranteed to work on any phone or incognito window without needing admin org state)
  if (currentRoute === 'public-queue') {
    const activeSlug = (publicRouteParams.slug || currentOrg?.slug || '').trim();
    return (
      <PublicQueue
        slug={activeSlug}
        onBackToHome={() => {
          const session = StorageService.getAuthSession();
          if (session.isAuthenticated) {
            handleNavigate(session.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard');
          } else {
            handleNavigate('landing');
          }
        }}
        onNavigateToBooking={(slug) => {
          handleNavigateToPublic('BOOKING', slug);
        }}
      />
    );
  }

  if (currentRoute === 'public-booking') {
    const activeSlug = (publicRouteParams.slug || currentOrg?.slug || '').trim();
    return (
      <PublicBooking
        slug={activeSlug}
        onNavigateToQueue={(slug) => {
          handleNavigateToPublic('QUEUE', slug);
        }}
        onBookingSuccess={(token) => {
          handleNavigateToPublic('TRACKER', token);
        }}
        onBackToHome={() => {
          const session = StorageService.getAuthSession();
          if (session.isAuthenticated) {
            handleNavigate(session.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard');
          } else {
            handleNavigate('landing');
          }
        }}
      />
    );
  }

  if (currentRoute === 'public-store') {
    const activeSlug = (publicRouteParams.slug || currentOrg?.slug || '').trim();
    return (
      <PublicStorefront
        slug={activeSlug}
        onNavigateToBooking={(slug) => {
          handleNavigateToPublic('BOOKING', slug);
        }}
        onNavigateToQueue={(slug) => {
          handleNavigateToPublic('QUEUE', slug);
        }}
        onBackToHome={() => {
          const session = StorageService.getAuthSession();
          if (session.isAuthenticated) {
            handleNavigate(session.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard');
          } else {
            handleNavigate('landing');
          }
        }}
      />
    );
  }

  if (currentRoute === 'public-tracker' && publicRouteParams.token) {
    return (
      <PublicAppointmentTracker
        token={publicRouteParams.token}
        onBackToHome={() => {
          const session = StorageService.getAuthSession();
          if (session.isAuthenticated) {
            handleNavigate(session.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard');
          } else {
            handleNavigate('landing');
          }
        }}
      />
    );
  }

  const activeSession = authSession.isAuthenticated ? authSession : StorageService.getAuthSession();
  const isPublicRoute =
    currentRoute === 'landing' ||
    currentRoute === 'public-booking' ||
    currentRoute === 'public-queue' ||
    currentRoute === 'public-store' ||
    currentRoute === 'public-tracker' ||
    currentRoute === 'client-portal';

  // 2. Render Marketing Landing Page or Protect Internal Routes if not authenticated
  if (currentRoute === 'landing' || (!isPublicRoute && !activeSession.isAuthenticated)) {
    return (
      <>
        <LandingPage
          onStartOnboarding={() => setIsOnboardingOpen(true)}
          onEnterDashboard={() => handleOpenLogin('OWNER')}
          onEnterSuperAdmin={() => {
            if (StorageService.isSuperAdminAuthenticated()) {
              handleChangeRole('SUPER_ADMIN');
              handleNavigate('superadmin');
            } else {
              handleOpenLogin('SUPER_ADMIN');
            }
          }}
          onOpenLogin={handleOpenLogin}
          plans={StorageService.getPlans()}
        />

        {/* 7-Step Onboarding Wizard */}
        <OnboardingWizard
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onSuccess={handleOnboardingSuccess}
          onOpenLogin={() => {
            setIsOnboardingOpen(false);
            handleOpenLogin('OWNER');
          }}
        />

        {/* Global Login Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          initialTab={loginInitialTab}
          onSuccess={handleLoginSuccess}
          onOpenRegister={() => {
            setIsLoginModalOpen(false);
            setIsOnboardingOpen(true);
          }}
        />
      </>
    );
  }

  // 3. Super Admin Panel doesn't require an active tenant organization
  if (
    currentRoute === 'superadmin' ||
    currentRoute === 'superadmin-orgs' ||
    currentRoute === 'superadmin-plans' ||
    currentRoute === 'superadmin-logs'
  ) {
    const adminFallbackOrg = currentOrg || StorageService.getAllOrganizations()[0] || {
      id: 'org-prime',
      name: 'Painel Global SuperAdmin',
      slug: 'superadmin',
      type: 'Barbearia',
      description: '',
      phone: '',
      whatsapp: '',
      instagram: '',
      address: {},
      workingHours: [],
      settings: {},
      isActive: true,
      createdAt: new Date().toISOString()
    };
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
        <Header
          currentOrg={adminFallbackOrg}
          onSelectOrg={handleSelectOrg}
          currentRole={currentRole}
          onChangeRole={handleChangeRole}
          selectedProfessional={undefined}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onNavigate={handleNavigate}
          onOpenLogin={handleOpenLogin}
          onNavigateToQueue={(slug) => handleNavigateToPublic('QUEUE', slug)}
          onNavigateToBooking={(slug) => handleNavigateToPublic('BOOKING', slug)}
          onNavigateToStore={(slug) => handleNavigateToPublic('STORE', slug)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <SuperAdminDashboard />
          </div>
        </main>
      </div>
    );
  }

  // 4. Resolve Tenant Organization with instantaneous fallback
  const resolvedOrg = currentOrg || StorageService.getAllOrganizations()[0];
  if (!resolvedOrg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4 text-white font-sans">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
          <Scissors className="h-7 w-7 text-amber-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">BarberOS - Fila Virtual</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Nenhuma barbearia ativa encontrada no momento. Cadastre seu estabelecimento para começar ou recarregue a página.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
          >
            Cadastrar Barbearia
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
          >
            Recarregar
          </button>
        </div>

        <OnboardingWizard
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onSuccess={handleOnboardingSuccess}
          onOpenLogin={() => {
            setIsOnboardingOpen(false);
            handleOpenLogin('OWNER');
          }}
        />
      </div>
    );
  }

  const selectedProfessional = selectedProfessionalId
    ? StorageService.getProfessionalById(selectedProfessionalId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
      {/* Main Top Header */}
      <Header
        currentOrg={resolvedOrg}
        onSelectOrg={handleSelectOrg}
        currentRole={currentRole}
        onChangeRole={handleChangeRole}
        selectedProfessional={selectedProfessional}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onNavigate={(route) => {
          if ((route === 'superadmin' || route.startsWith('superadmin-')) && !StorageService.isSuperAdminAuthenticated()) {
            handleOpenLogin('SUPER_ADMIN');
            return;
          }
          handleNavigate(route);
        }}
        onOpenLogin={handleOpenLogin}
        onNavigateToQueue={(slug) => handleNavigateToPublic('QUEUE', slug)}
        onNavigateToBooking={(slug) => handleNavigateToPublic('BOOKING', slug)}
        onNavigateToStore={(slug) => handleNavigateToPublic('STORE', slug)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          currentRole={currentRole}
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          orgName={resolvedOrg.name}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Subscription Alert for Owner if pending/not fully active */}
            {currentRole === 'OWNER' && resolvedOrg.subscription?.status !== 'ATIVA' && currentRoute !== 'assinatura' && (
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-slate-900 border border-amber-500/40 p-4 text-xs shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Assinatura Mensal Necessária</span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500 text-slate-950">
                        R$ 79,90 / mês
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-amber-300">
                        {resolvedOrg.subscription?.status === 'TESTE_GRATIS' ? 'Período de Testes' : 'Aguardando Pagamento'}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-0.5">
                      Para que o dono da barbearia possa usar o app 100% (agendamentos ilimitados, fila ao vivo com QR Code, painel de cadeiras, comissões e financeiro), é necessário realizar o pagamento mensal de R$ 79,90.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleNavigate('assinatura')}
                    className="rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => setIsSubscriptionModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Pagar R$ 79,90 e Liberar 100%</span>
                  </button>
                </div>
              </div>
            )}

            {/* View Switcher */}
            {currentRoute === 'dashboard' && (
              <OwnerDashboard
                organization={resolvedOrg}
                onNavigate={handleNavigate}
                onOpenNewAppointmentModal={() => setIsNewAppointmentOpen(true)}
                onOpenNewQueueModal={() => setIsNewQueueOpen(true)}
                onNavigateToQueue={(slug) => handleNavigateToPublic('QUEUE', slug)}
                onNavigateToBooking={(slug) => handleNavigateToPublic('BOOKING', slug)}
              />
            )}

            {currentRoute === 'operacional' && (
              <SubscriptionPaywallGate
                organization={resolvedOrg}
                featureTitle="Modo Barbearia (Painel das Cadeiras)"
                featureDescription="Visualização em tempo real das cadeiras em atendimento, tempo de corte e chamada da fila."
                onUnlocked={() => {
                  const updated = StorageService.getOrganizationById(resolvedOrg.id);
                  if (updated) setCurrentOrg({ ...updated });
                }}
                onBackToDashboard={() => handleNavigate('dashboard')}
              >
                <OperationalBoard
                  organization={resolvedOrg}
                  selectedProfessionalId={selectedProfessionalId}
                  onOpenNewQueueModal={() => setIsNewQueueOpen(true)}
                  onOpenNewAppointmentModal={() => setIsNewAppointmentOpen(true)}
                />
              </SubscriptionPaywallGate>
            )}

            {currentRoute === 'agenda' && (
              <AgendaView
                organization={resolvedOrg}
                selectedProfessionalId={selectedProfessionalId}
                onOpenNewAppointmentModal={() => setIsNewAppointmentOpen(true)}
              />
            )}

            {currentRoute === 'fila' && (
              <QueueManagement
                organization={resolvedOrg}
                onNavigateToQueue={(slug) => handleNavigateToPublic('QUEUE', slug)}
              />
            )}

            {currentRoute === 'clientes' && (
              <CustomersView organization={resolvedOrg} />
            )}

            {currentRoute === 'profissionais' && (
              <ProfessionalsView organization={resolvedOrg} />
            )}

            {currentRoute === 'servicos' && (
              <ServicesView organization={resolvedOrg} />
            )}

            {currentRoute === 'financeiro' && (
              <SubscriptionPaywallGate
                organization={resolvedOrg}
                featureTitle="Controle Financeiro, Caixa e Comissões"
                featureDescription="Fluxo de caixa, DRE gerencial, distribuição automática de comissões por barbeiro e despesas."
                onUnlocked={() => {
                  const updated = StorageService.getOrganizationById(resolvedOrg.id);
                  if (updated) setCurrentOrg({ ...updated });
                }}
                onBackToDashboard={() => handleNavigate('dashboard')}
              >
                <FinancialView organization={resolvedOrg} />
              </SubscriptionPaywallGate>
            )}

            {currentRoute === 'assinatura' && (
              <SubscriptionView organization={resolvedOrg} />
            )}

            {currentRoute === 'relatorios' && (
              <SubscriptionPaywallGate
                organization={resolvedOrg}
                featureTitle="Relatórios e Indicadores Gerenciais"
                featureDescription="Estatísticas de faturamento, serviços mais lucrativos, taxa de no-show e ranking de desempenho."
                onUnlocked={() => {
                  const updated = StorageService.getOrganizationById(resolvedOrg.id);
                  if (updated) setCurrentOrg({ ...updated });
                }}
                onBackToDashboard={() => handleNavigate('dashboard')}
              >
                <ReportsView organization={resolvedOrg} />
              </SubscriptionPaywallGate>
            )}

            {currentRoute === 'avaliacoes' && (
              <ReviewsView organization={resolvedOrg} />
            )}

            {currentRoute === 'qrcodes' && (
              <QRCodesView
                organization={resolvedOrg}
                onNavigateToQueue={(slug) => handleNavigateToPublic('QUEUE', slug)}
                onNavigateToBooking={(slug) => handleNavigateToPublic('BOOKING', slug)}
                onNavigateToStore={(slug) => handleNavigateToPublic('STORE', slug)}
              />
            )}

            {currentRoute === 'configuracoes' && (
              <SettingsView
                organization={resolvedOrg}
                onNavigate={handleNavigate}
              />
            )}

            {/* Super Admin Global Panel */}
            {(currentRoute === 'superadmin' ||
              currentRoute === 'superadmin-orgs' ||
              currentRoute === 'superadmin-plans' ||
              currentRoute === 'superadmin-logs') && (
              <SuperAdminDashboard />
            )}

            {/* Client Portal View */}
            {currentRoute === 'client-portal' && (
              <ClientPortal
                organization={resolvedOrg}
                onNavigateToBooking={(slug) => {
                  setPublicRouteParams({ type: 'BOOKING', slug });
                  setCurrentRoute('public-booking');
                }}
                onNavigateToQueue={(slug) => {
                  setPublicRouteParams({ type: 'QUEUE', slug });
                  setCurrentRoute('public-queue');
                }}
                onOpenAppointmentTracker={(token) => {
                  setPublicRouteParams({ type: 'TRACKER', token });
                  setCurrentRoute('public-tracker');
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        currentRole={currentRole}
      />

      {/* Global Quick Action Modals */}
      <GlobalModals
        organization={resolvedOrg}
        isNewAppointmentOpen={isNewAppointmentOpen}
        onCloseNewAppointment={() => setIsNewAppointmentOpen(false)}
        isNewQueueOpen={isNewQueueOpen}
        onCloseNewQueue={() => setIsNewQueueOpen(false)}
      />

      {/* 7-Step Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={handleOnboardingSuccess}
        onOpenLogin={() => {
          setIsOnboardingOpen(false);
          handleOpenLogin('OWNER');
        }}
      />

      {/* Global Subscription Checkout Modal (R$ 79,90 e R$ 838,80) */}
      <SubscriptionCheckoutModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        organization={resolvedOrg}
        onSuccess={() => {
          setIsSubscriptionModalOpen(false);
          const updated = StorageService.getOrganizationById(resolvedOrg.id);
          if (updated) setCurrentOrg({ ...updated });
        }}
      />

      {/* Global Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialTab={loginInitialTab}
        onSuccess={handleLoginSuccess}
        onOpenRegister={() => {
          setIsLoginModalOpen(false);
          setIsOnboardingOpen(true);
        }}
      />
    </div>
  );
}
