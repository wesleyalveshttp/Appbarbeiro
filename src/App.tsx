import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { Organization, Professional, UserRole } from './types';

// Common Layout Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { GlobalModals } from './components/common/GlobalModals';

// Admin / Dashboard Views
import { OwnerDashboard } from './components/admin/OwnerDashboard';
import { OperationalBoard } from './components/admin/OperationalBoard';
import { AgendaView } from './components/admin/AgendaView';
import { QueueManagement } from './components/admin/QueueManagement';
import { CustomersView } from './components/admin/CustomersView';
import { ProfessionalsView } from './components/admin/ProfessionalsView';
import { ServicesView } from './components/admin/ServicesView';
import { FinancialView } from './components/admin/FinancialView';
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

export default function App() {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>();
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Modals State
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isNewQueueOpen, setIsNewQueueOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Path routing parsing (e.g. /agendar/dom-navalha, /fila/dom-navalha, /b/dom-navalha, /atendimento/token)
  const [publicRouteParams, setPublicRouteParams] = useState<{
    type: 'BOOKING' | 'QUEUE' | 'STORE' | 'TRACKER' | null;
    slug?: string;
    token?: string;
  }>({ type: null });

  // Initialize Organization & Session
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);

      if (parts[0] === 'agendar' && parts[1]) {
        setPublicRouteParams({ type: 'BOOKING', slug: parts[1] });
        setCurrentRoute('public-booking');
        return;
      }
      if (parts[0] === 'fila' && parts[1]) {
        setPublicRouteParams({ type: 'QUEUE', slug: parts[1] });
        setCurrentRoute('public-queue');
        return;
      }
      if (parts[0] === 'b' && parts[1]) {
        setPublicRouteParams({ type: 'STORE', slug: parts[1] });
        setCurrentRoute('public-store');
        return;
      }
      if (parts[0] === 'atendimento' && parts[1]) {
        setPublicRouteParams({ type: 'TRACKER', token: parts[1] });
        setCurrentRoute('public-tracker');
        return;
      }
    };

    parseUrl();

    // Load active org and role
    const orgId = StorageService.getCurrentOrgId();
    const org = StorageService.getOrganizationById(orgId) || StorageService.getAllOrganizations()[0];
    if (org) setCurrentOrg(org);

    const roleInfo = StorageService.getCurrentRole();
    setCurrentRole(roleInfo.role);
    setSelectedProfessionalId(roleInfo.professionalId);
  }, []);

  const handleSelectOrg = (org: Organization) => {
    setCurrentOrg(org);
    StorageService.setCurrentOrgId(org.id);
  };

  const handleChangeRole = (role: UserRole, professionalId?: string) => {
    setCurrentRole(role);
    setSelectedProfessionalId(professionalId);
    StorageService.setCurrentRole(role, professionalId);
  };

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    setPublicRouteParams({ type: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOnboardingSuccess = (newOrg: Organization) => {
    setCurrentOrg(newOrg);
    StorageService.setCurrentOrgId(newOrg.id);
    setIsOnboardingOpen(false);
    setCurrentRoute('dashboard');
  };

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const selectedProfessional = selectedProfessionalId
    ? StorageService.getProfessionalById(selectedProfessionalId)
    : undefined;

  // Render Public Direct Route Overlays
  if (currentRoute === 'public-booking' && publicRouteParams.slug) {
    return (
      <PublicBooking
        slug={publicRouteParams.slug}
        onNavigateToQueue={(slug) => {
          setPublicRouteParams({ type: 'QUEUE', slug });
          setCurrentRoute('public-queue');
        }}
        onBookingSuccess={(token) => {
          setPublicRouteParams({ type: 'TRACKER', token });
          setCurrentRoute('public-tracker');
        }}
        onBackToHome={() => handleNavigate('landing')}
      />
    );
  }

  if (currentRoute === 'public-queue' && publicRouteParams.slug) {
    return (
      <PublicQueue
        slug={publicRouteParams.slug}
        onBackToHome={() => handleNavigate('landing')}
        onNavigateToBooking={(slug) => {
          setPublicRouteParams({ type: 'BOOKING', slug });
          setCurrentRoute('public-booking');
        }}
      />
    );
  }

  if (currentRoute === 'public-store' && publicRouteParams.slug) {
    return (
      <PublicStorefront
        slug={publicRouteParams.slug}
        onNavigateToBooking={(slug) => {
          setPublicRouteParams({ type: 'BOOKING', slug });
          setCurrentRoute('public-booking');
        }}
        onNavigateToQueue={(slug) => {
          setPublicRouteParams({ type: 'QUEUE', slug });
          setCurrentRoute('public-queue');
        }}
        onBackToHome={() => handleNavigate('landing')}
      />
    );
  }

  if (currentRoute === 'public-tracker' && publicRouteParams.token) {
    return (
      <PublicAppointmentTracker
        token={publicRouteParams.token}
        onBackToHome={() => handleNavigate('landing')}
      />
    );
  }

  // Render Marketing Landing Page (#7)
  if (currentRoute === 'landing') {
    return (
      <LandingPage
        onStartOnboarding={() => setIsOnboardingOpen(true)}
        onEnterDashboard={() => handleNavigate('dashboard')}
        plans={StorageService.getPlans()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Main Top Header */}
      <Header
        currentOrg={currentOrg}
        onSelectOrg={handleSelectOrg}
        currentRole={currentRole}
        onChangeRole={handleChangeRole}
        selectedProfessional={selectedProfessional}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onNavigate={handleNavigate}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          currentRole={currentRole}
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          orgName={currentOrg.name}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* View Switcher */}
            {currentRoute === 'dashboard' && (
              <OwnerDashboard
                organization={currentOrg}
                onNavigate={handleNavigate}
                onOpenNewAppointmentModal={() => setIsNewAppointmentOpen(true)}
                onOpenNewQueueModal={() => setIsNewQueueOpen(true)}
              />
            )}

            {currentRoute === 'operacional' && (
              <OperationalBoard
                organization={currentOrg}
                selectedProfessionalId={selectedProfessionalId}
                onOpenNewQueueModal={() => setIsNewQueueOpen(true)}
                onOpenNewAppointmentModal={() => setIsNewAppointmentOpen(true)}
              />
            )}

            {currentRoute === 'agenda' && (
              <AgendaView
                organization={currentOrg}
                selectedProfessionalId={selectedProfessionalId}
                onOpenNewAppointmentModal={() => setIsNewAppointmentOpen(true)}
              />
            )}

            {currentRoute === 'fila' && (
              <QueueManagement organization={currentOrg} />
            )}

            {currentRoute === 'clientes' && (
              <CustomersView organization={currentOrg} />
            )}

            {currentRoute === 'profissionais' && (
              <ProfessionalsView organization={currentOrg} />
            )}

            {currentRoute === 'servicos' && (
              <ServicesView organization={currentOrg} />
            )}

            {currentRoute === 'financeiro' && (
              <FinancialView organization={currentOrg} />
            )}

            {currentRoute === 'relatorios' && (
              <ReportsView organization={currentOrg} />
            )}

            {currentRoute === 'avaliacoes' && (
              <ReviewsView organization={currentOrg} />
            )}

            {currentRoute === 'qrcodes' && (
              <QRCodesView organization={currentOrg} />
            )}

            {currentRoute === 'configuracoes' && (
              <SettingsView organization={currentOrg} />
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
                organization={currentOrg}
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
        organization={currentOrg}
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
      />
    </div>
  );
}
