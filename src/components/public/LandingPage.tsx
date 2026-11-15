import React, { useState } from 'react';
import {
  Scissors,
  Clock,
  Calendar,
  Users,
  DollarSign,
  QrCode,
  ShieldCheck,
  Check,
  ArrowRight,
  Smartphone,
  ChevronDown,
  Star,
  BellRing,
  Vibrate,
  Menu,
  X,
  MessageCircle,
  RotateCcw,
  UserPlus,
  Volume2,
  CheckCircle2
} from 'lucide-react';
import { SaaSPlan } from '../../types';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onEnterDashboard: () => void;
  onEnterSuperAdmin?: () => void;
  onOpenLogin?: (tab?: 'OWNER' | 'SUPER_ADMIN') => void;
  plans: SaaSPlan[];
}

interface DemoCustomer {
  id: string;
  name: string;
  service: string;
  barber: string;
  status: 'WAITING' | 'CALLED' | 'ON_THE_WAY' | 'IN_CHAIR';
}

const INITIAL_DEMO_QUEUE: DemoCustomer[] = [
  { id: 'c1', name: 'Lucas Mendes', service: 'Corte Degradê + Barba', barber: 'Rodrigo', status: 'WAITING' },
  { id: 'c2', name: 'Gabriel Costa', service: 'Corte Social', barber: 'Rodrigo', status: 'WAITING' },
  { id: 'c3', name: 'Rafael Oliveira', service: 'Barba Terapia', barber: 'Marcos', status: 'WAITING' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onEnterDashboard,
  onOpenLogin,
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  // Interactive hero demo state (simulating Barber Panel + Customer Phone in sync)
  const [demoQueue, setDemoQueue] = useState<DemoCustomer[]>(INITIAL_DEMO_QUEUE);
  const [soundSilenced, setSoundSilenced] = useState(false);
  const [mobilePreviewTab, setMobilePreviewTab] = useState<'client' | 'barber'>('client');

  const scrollTo = (id: string) => {
    setIsMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLoginClick = () => {
    setIsMobileNavOpen(false);
    if (onOpenLogin) {
      onOpenLogin('OWNER');
    } else {
      onEnterDashboard();
    }
  };

  // Focus customer in the interactive phone mockup is the first active customer in demoQueue
  const primaryClient = demoQueue[0];
  const waitingCount = demoQueue.filter((c) => c.status === 'WAITING').length;

  const handleCallNextClient = () => {
    setSoundSilenced(false);
    setDemoQueue((prev) => {
      const nextIdx = prev.findIndex((c) => c.status === 'WAITING');
      if (nextIdx === -1) return INITIAL_DEMO_QUEUE;
      return prev.map((c, idx) => (idx === nextIdx ? { ...c, status: 'CALLED' } : c));
    });
  };

  const handleClientOnTheWay = () => {
    setSoundSilenced(true);
    setDemoQueue((prev) =>
      prev.map((c) => (c.status === 'CALLED' ? { ...c, status: 'ON_THE_WAY' } : c))
    );
  };

  const handleAddSimulatedClient = () => {
    const names = ['Matheus Silva', 'Bruno Rocha', 'Felipe Duarte', 'Vinícius Lima'];
    const services = ['Corte + Sobrancelha', 'Degradê Navalhado', 'Corte + Barba'];
    const randomName = names[demoQueue.length % names.length];
    const randomService = services[demoQueue.length % services.length];
    setDemoQueue((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        name: randomName,
        service: randomService,
        barber: 'Rodrigo',
        status: 'WAITING',
      },
    ]);
  };

  const handleResetDemo = () => {
    setSoundSilenced(false);
    setDemoQueue(INITIAL_DEMO_QUEUE);
  };

  const faqs = [
    {
      question: 'O cliente precisa baixar algum aplicativo no celular?',
      answer:
        'Não. O cliente não precisa instalar nada nem criar senha. Ele apenas escaneia o QR Code no balcão ou abre o link exclusivo da sua barbearia (vendaiapro.com.br/fila/sua-barbearia) direto no navegador do celular e entra na fila em 5 segundos.'
    },
    {
      question: 'Funciona para mais de um barbeiro na mesma barbearia?',
      answer:
        'Sim. Você pode cadastrar quantos barbeiros e cadeiras precisar, sem custo adicional por profissional. O cliente pode escolher um barbeiro de preferência ou entrar na fila geral do próximo profissional livre, com cálculo de comissões individualizado.'
    },
    {
      question: 'Como funciona o cancelamento se eu não quiser continuar?',
      answer:
        'O cancelamento pode ser feito a qualquer momento, sem multa, sem fidelidade e sem burocracia. Além disso, você conta com 7 dias de teste grátis e garantia incondicional para validar o sistema na rotina real da sua barbearia.'
    },
    {
      question: 'Como o cliente sabe quando está chegando a vez dele?',
      answer:
        'O cliente acompanha a posição exata ao vivo na tela. Quando faltar cerca de 15 minutos, o sistema envia um aviso antecipado para ele se preparar. Na hora em que você clicar em "Chamar Próximo", o celular vibra e emite um alerta sonoro até ele tocar em "Já estou indo!".'
    },
    {
      question: 'Quanto tempo leva para colocar a barbearia no ar?',
      answer:
        'Cerca de 2 minutos. Você cadastra o nome da barbearia, serviços e equipe, e o sistema já gera na hora seu link exclusivo e os cartazes com QR Code prontos para imprimir e colocar no balcão ou espelho.'
    }
  ];

  const testimonials = [
    {
      quote:
        'Antes os clientes viam 5 pessoas esperando no sábado, davam meia-volta e iam embora. Com a fila virtual, o cara garante a vaga pelo celular enquanto termina o almoço e chega só na hora de sentar na cadeira.',
      name: 'Rodrigo Cavalcante',
      shop: 'Barbearia Dom Navalha',
      location: 'São Paulo / SP',
      result: '-78% de desistências no sábado'
    },
    {
      quote:
        'Tenho 4 barbeiros trabalhando juntos e era uma confusão saber quem era o próximo de quem. Agora cada barbeiro chama direto no painel da bancada e o celular do cliente avisa na hora. O plano anual se pagou na primeira semana.',
      name: 'Marcos Ferreira',
      shop: 'Mestre da Navalha Barbershop',
      location: 'Belo Horizonte / MG',
      result: '+32 atendimentos por semana'
    },
    {
      quote:
        'Meus clientes elogiam todo dia porque não precisam baixar nenhum aplicativo. Eles apontam a câmera para o QR Code na recepção e já ficam acompanhando o tempo de espera em tempo real.',
      name: 'Thiago Almeida',
      shop: 'Almeida Cortes & Barba',
      location: 'João Pessoa / PB',
      result: 'Cadeiras ocupadas o dia todo'
    }
  ];

  const whatsappMessage = encodeURIComponent(
    'Olá! Estou vendo o BarberOS em vendaiapro.com.br e tenho uma dúvida sobre os planos e a fila virtual.'
  );

  return (
    <div className="min-h-screen bg-[#090B0E] text-zinc-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* CLEAN TOP HEADER — ONLY Logo, Anchors, Entrar, Testar Grátis */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#090B0E]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Zone */}
          <a
            href="#topo"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 shadow-sm">
              <Scissors className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">BarberOS</span>
          </a>

          {/* Navigation Anchors Zone */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium text-zinc-400">
            <button
              onClick={() => scrollTo('como-funciona')}
              className="whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer"
            >
              Como Funciona
            </button>
            <button
              onClick={() => scrollTo('recursos')}
              className="whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer"
            >
              Recursos
            </button>
            <button
              onClick={() => scrollTo('planos')}
              className="whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer"
            >
              Planos
            </button>
            <button
              onClick={() => scrollTo('duvidas')}
              className="whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer"
            >
              Dúvidas
            </button>
          </nav>

          {/* Actions Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleLoginClick}
              className="hidden sm:inline-flex items-center justify-center whitespace-nowrap shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Entrar
            </button>

            <button
              onClick={onStartOnboarding}
              className="inline-flex items-center justify-center whitespace-nowrap shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-bold text-zinc-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Testar Grátis
            </button>

            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label={isMobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileNavOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-[#090B0E] px-5 py-4 space-y-2">
            <button
              onClick={() => scrollTo('como-funciona')}
              className="block w-full text-left py-2.5 text-sm font-medium text-zinc-300 hover:text-white"
            >
              Como Funciona
            </button>
            <button
              onClick={() => scrollTo('recursos')}
              className="block w-full text-left py-2.5 text-sm font-medium text-zinc-300 hover:text-white"
            >
              Recursos
            </button>
            <button
              onClick={() => scrollTo('planos')}
              className="block w-full text-left py-2.5 text-sm font-medium text-zinc-300 hover:text-white"
            >
              Planos
            </button>
            <button
              onClick={() => scrollTo('duvidas')}
              className="block w-full text-left py-2.5 text-sm font-medium text-zinc-300 hover:text-white"
            >
              Dúvidas
            </button>
            <div className="pt-3 mt-2 border-t border-zinc-800 grid grid-cols-2 gap-3">
              <button
                onClick={handleLoginClick}
                className="py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 text-center"
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onStartOnboarding();
                }}
                className="py-2.5 rounded-lg bg-emerald-500 text-sm font-bold text-zinc-950 text-center"
              >
                Testar Grátis
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION — HIGH-CONVERSION FIRST FOLD */}
      <section id="topo" className="relative overflow-hidden border-b border-zinc-900 pt-12 pb-16 lg:pt-20 lg:pb-24">
        {/* Subtle atmospheric glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_75%_60%_at_50%_-10%,rgba(245,158,11,0.12),rgba(16,185,129,0.06),transparent)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Copy & Conversion Zone */}
            <div className="lg:col-span-6 text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">
                Fila Virtual Inteligente • vendaiapro.com.br
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12] text-balance">
                Acabe com as cadeiras vazias e a desistência de clientes na sua barbearia.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
                Organize o atendimento com uma fila virtual inteligente. Seu cliente entra na fila pelo celular em 5 segundos, sem baixar aplicativos, e recebe avisos na hora da vez dele.
              </p>

              {/* High-Contrast CTA */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3.5">
                <button
                  onClick={onStartOnboarding}
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-7 py-4 text-base font-extrabold text-zinc-950 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Testar Grátis por 7 Dias</span>
                  <ArrowRight className="h-5 w-5 shrink-0" />
                </button>

                <button
                  onClick={() => scrollTo('como-funciona')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 px-5 py-4 text-sm font-semibold text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Ver Como Funciona</span>
                </button>
              </div>

              {/* Micro-copy below CTA */}
              <p className="mt-4 text-xs sm:text-sm font-medium text-zinc-400">
                ✓ Sem compromisso &nbsp;•&nbsp; ✓ Não precisa de cartão de crédito &nbsp;•&nbsp; ✓ Configuração em 2 minutos
              </p>

              {/* Concise real proof metrics */}
              <div className="mt-9 pt-7 border-t border-zinc-800/80 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">5s</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Para entrar na fila</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-amber-400 tabular-nums">15 min</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Aviso antecipado</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tabular-nums">0 apps</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Direto no navegador</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Live Simulation: Barber Panel + Customer Phone */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-4 sm:p-5 shadow-2xl">
                {/* Simulation Controls Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-zinc-800">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                      Demonstração Interativa ao Vivo
                    </span>
                    <span className="text-xs text-zinc-400">
                      Clique em &ldquo;Chamar Próximo&rdquo; no painel e veja o celular do cliente reagir
                    </span>
                  </div>
                  <button
                    onClick={handleResetDemo}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reiniciar Demo</span>
                  </button>
                </div>

                {/* Mobile Switcher for tight viewports */}
                <div className="grid grid-cols-2 gap-2 mb-4 sm:hidden">
                  <button
                    onClick={() => setMobilePreviewTab('client')}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                      mobilePreviewTab === 'client'
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Celular do Cliente
                  </button>
                  <button
                    onClick={() => setMobilePreviewTab('barber')}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                      mobilePreviewTab === 'barber'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Painel do Barbeiro
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                  {/* BARBER CONSOLE MOCKUP (7 cols) */}
                  <div
                    className={`sm:col-span-7 rounded-xl border border-zinc-800 bg-[#090B0E] p-3.5 flex flex-col justify-between ${
                      mobilePreviewTab === 'barber' ? 'flex' : 'hidden sm:flex'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-amber-400" />
                          <span className="text-xs font-bold text-white">Painel da Bancada</span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                          {waitingCount} aguardando
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[210px] overflow-y-auto pr-0.5">
                        {demoQueue.slice(0, 4).map((client, index) => (
                          <div
                            key={client.id}
                            className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                              client.status === 'CALLED'
                                ? 'border-amber-500/60 bg-amber-500/10'
                                : client.status === 'ON_THE_WAY'
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-zinc-800 bg-zinc-900/70'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-amber-400 tabular-nums">
                                  #{index + 1}
                                </span>
                                <span className="text-xs font-semibold text-white truncate">
                                  {client.name}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {client.service} • {client.barber}
                              </div>
                            </div>

                            <span
                              className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                client.status === 'CALLED'
                                  ? 'bg-amber-500 text-zinc-950'
                                  : client.status === 'ON_THE_WAY'
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {client.status === 'CALLED'
                                ? 'Chamado'
                                : client.status === 'ON_THE_WAY'
                                ? 'A caminho'
                                : 'Na fila'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                      <button
                        onClick={handleCallNextClient}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-2.5 text-xs font-extrabold text-zinc-950 shadow-md transition-all cursor-pointer"
                      >
                        <BellRing className="h-4 w-4" />
                        <span>Chamar Próximo Cliente</span>
                      </button>

                      <button
                        onClick={handleAddSimulatedClient}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-300 transition-colors cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Simular Novo Cliente na Fila</span>
                      </button>
                    </div>
                  </div>

                  {/* CUSTOMER PHONE MOCKUP (5 cols) */}
                  <div
                    className={`sm:col-span-5 rounded-[1.5rem] border-2 border-zinc-700 bg-[#050608] p-3 flex flex-col justify-between shadow-xl ${
                      mobilePreviewTab === 'client' ? 'flex' : 'hidden sm:flex'
                    }`}
                  >
                    <div>
                      {/* Simulated Mobile Browser URL */}
                      <div className="rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 mb-3 text-center">
                        <span className="text-[10px] font-mono text-zinc-300 truncate block">
                          vendaiapro.com.br/fila/dom-navalha
                        </span>
                      </div>

                      {primaryClient.status === 'CALLED' ? (
                        <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 p-3 text-center space-y-2.5">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-zinc-950">
                            <Volume2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                              Chegou sua vez!
                            </div>
                            <div className="text-sm font-extrabold text-white mt-0.5">
                              {primaryClient.name}
                            </div>
                            <div className="text-[11px] text-zinc-300 mt-1">
                              Dirija-se à cadeira do <strong className="text-white">{primaryClient.barber}</strong>
                            </div>
                          </div>

                          <button
                            onClick={handleClientOnTheWay}
                            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2.5 px-2 text-xs font-extrabold text-zinc-950 shadow-lg cursor-pointer transition-all"
                          >
                            Já estou indo! (Parar som)
                          </button>
                        </div>
                      ) : primaryClient.status === 'ON_THE_WAY' ? (
                        <div className="rounded-xl border border-emerald-500/40 bg-zinc-900/90 p-3.5 text-center space-y-2">
                          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                          <div className="text-xs font-bold text-white">
                            Presença confirmada!
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-snug">
                            {soundSilenced ? 'Alerta sonoro silenciado. ' : ''}
                            O barbeiro {primaryClient.barber} já está aguardando você na cadeira.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-center space-y-2.5">
                          <div className="text-[11px] font-semibold text-zinc-400">
                            Olá, <span className="text-white font-bold">{primaryClient.name}</span>
                          </div>

                          <div className="py-1">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                              Sua posição atual
                            </div>
                            <div className="text-3xl font-extrabold text-amber-400 font-mono tabular-nums mt-0.5">
                              #1º
                            </div>
                            <div className="text-[11px] text-zinc-300 mt-1 tabular-nums">
                              Espera estimada: <strong className="text-white">~15 min</strong>
                            </div>
                          </div>

                          <div className="rounded-lg bg-[#090B0E] border border-zinc-800 px-2.5 py-2 text-[11px] text-emerald-400 font-medium">
                            Você receberá um alerta com som e vibração na sua vez
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Sem baixar app</span>
                      <span className="text-zinc-400 font-medium">Tempo real</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA EM 3 PASSOS SIMPLES */}
      <section id="como-funciona" className="py-16 lg:py-24 border-b border-zinc-900 bg-[#0C0F14]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Simples de Usar
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
              Como Funciona em 3 Passos Simples
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Em 2 minutos você coloca a fila virtual para rodar na sua barbearia, sem treinamento complexo para a equipe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-zinc-700 font-mono tabular-nums">01</span>
                </div>
                <h3 className="text-lg font-bold text-white">Imprima o QR Code da barbearia</h3>
                <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                  Ao criar sua conta, o BarberOS gera automaticamente seu link exclusivo e o cartaz com QR Code para colocar no balcão, espelho ou vitrine.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-800/80 text-xs font-mono text-zinc-400 truncate">
                vendaiapro.com.br/fila/sua-barbearia
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-zinc-700 font-mono tabular-nums">02</span>
                </div>
                <h3 className="text-lg font-bold text-white">O cliente escaneia e entra na fila sem baixar app</h3>
                <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                  Pelo próprio navegador do celular, ele informa nome e WhatsApp em 5 segundos, escolhe o serviço e acompanha quantas pessoas faltam de onde estiver.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-800/80 text-xs font-semibold text-emerald-400">
                ✓ Zero downloads • Zero cadastros longos
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-zinc-700 font-mono tabular-nums">03</span>
                </div>
                <h3 className="text-lg font-bold text-white">Você chama o próximo com um clique</h3>
                <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                  Quando faltar 15 minutos, o cliente recebe aviso antecipado. Ao clicar em &ldquo;Chamar Próximo&rdquo;, o celular dele toca e vibra até confirmar que já está indo.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-800/80 text-xs font-semibold text-amber-400">
                ✓ Menos cadeira parada • Mais cortes no dia
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS COMPLETOS */}
      <section id="recursos" className="py-16 lg:py-24 border-b border-zinc-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12 lg:mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Plataforma Completa
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
              Tudo que sua barbearia precisa para faturar mais sem bagunça na recepção
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Fila Virtual em Tempo Real</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                O cliente vê a posição exata, quantos cortes faltam e o tempo médio estimado direto na tela do celular, sem precisar ficar perguntando no balcão.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Vibrate className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Alerta Antecipado + Botão &ldquo;Já Estou Indo&rdquo;</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Envia aviso prévio com 15 minutos de antecedência e dispara toque sonoro e vibração quando a cadeira libera, parando o som quando o cliente confirma.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Barbeiros e Cadeiras</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Cada profissional acessa sua bancada no celular ou tablet sem interferir na chamada do colega. Suporta fila por barbeiro ou fila geral rotativa.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Agendamento Complementar 24h</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Para quem prefere marcar horário fixo em dias de semana, o mesmo link exclusivo em vendaiapro.com.br também oferece agenda online automática.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Caixa e Comissões Automáticas</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Finalize cada atendimento com 1 clique e tenha o relatório diário por forma de pagamento (PIX, cartão, dinheiro) e comissão exata de cada barbeiro.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Link Exclusivo + Cartaz QR Code</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Coloque na bio do Instagram, no WhatsApp e impresso no balcão. O cliente aponta a câmera e já cai direto na sua fila personalizada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS E PREÇOS PERSUASIVOS */}
      <section id="planos" className="py-16 lg:py-24 border-b border-zinc-900 bg-[#0C0F14]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Planos Transparentes
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
              Um investimento menor que um corte de cabelo por mês
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Barbeiros e cadeiras ilimitados em ambos os planos. Comece hoje com 7 dias grátis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* PLANO MENSAL */}
            <div className="rounded-2xl border border-zinc-800 bg-[#11141A] p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-white">Plano Mensal</h3>
                  <span className="text-xs font-semibold text-zinc-400">Sem fidelidade</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Ideal para testar na rotina da barbearia pagando mês a mês.
                </p>

                <div className="mt-6 pb-6 border-b border-zinc-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-zinc-400">R$</span>
                    <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                      79,90
                    </span>
                    <span className="text-sm text-zinc-400">/mês</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Cancele quando quiser, sem taxa de cancelamento.
                  </p>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-zinc-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-1" />
                    <span>Fila virtual inteligente com posição ao vivo</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-1" />
                    <span>Barbeiros e cadeiras ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-1" />
                    <span>Avisos sonoros, vibração e confirmação &ldquo;Já estou indo!&rdquo;</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-1" />
                    <span>Link exclusivo em vendaiapro.com.br + QR Code para impressão</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-1" />
                    <span>Controle financeiro e comissões por barbeiro</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onStartOnboarding}
                className="mt-8 w-full rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 py-3.5 px-6 text-sm font-bold text-white transition-colors cursor-pointer"
              >
                Começar Teste Grátis
              </button>
            </div>

            {/* PLANO ANUAL (DESTAQUE) */}
            <div className="relative rounded-2xl border-2 border-amber-500/80 bg-gradient-to-b from-[#161922] to-[#11141A] p-8 flex flex-col justify-between shadow-2xl shadow-amber-500/10">
              <div className="absolute -top-3.5 right-6 rounded-full bg-amber-500 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-950 shadow-md">
                MAIS ESCOLHIDO - 2 MESES GRÁTIS
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-white">Plano Anual</h3>
                  <span className="text-xs font-bold text-emerald-400">Melhor Custo-Benefício</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">
                  Acesso completo por 12 meses com desconto exclusivo e preço protegido.
                </p>

                <div className="mt-6 pb-6 border-b border-zinc-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-zinc-400">R$</span>
                    <span className="text-4xl sm:text-5xl font-extrabold text-amber-400 font-mono tabular-nums tracking-tight">
                      838,80
                    </span>
                    <span className="text-sm font-semibold text-zinc-300">à vista</span>
                  </div>

                  <div className="mt-2.5 inline-flex items-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 tabular-nums">
                    Equivale a R$ 69,90/mês — Economize R$ 120,00
                  </div>

                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Pagamento à vista ou em até 12x no cartão (taxas de parcelamento aplicadas no checkout).
                  </p>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-zinc-200">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
                    <span><strong>Tudo do Plano Mensal liberado por 12 meses</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
                    <span><strong>Economia imediata de R$ 120,00</strong> comparado ao mensal</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
                    <span>Agendamento online 24/7 + Fila virtual ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
                    <span>Valor congelado sem reajustes durante todo o ano</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
                    <span>Suporte prioritário na implantação e WhatsApp</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onStartOnboarding}
                className="mt-8 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 py-4 px-6 text-sm font-extrabold text-zinc-950 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Garantir Desconto Anual
              </button>
            </div>
          </div>

          {/* BANNER DE GARANTIA INCONDICIONAL DE 7 DIAS */}
          <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Garantia Incondicional de 7 Dias — Risco Zero
              </h3>
              <p className="mt-1.5 text-sm text-zinc-300 leading-relaxed">
                Teste o BarberOS na sua barbearia com seus clientes reais por 7 dias inteiros. Se você não sentir que a fila ficou mais organizada e que as desistências diminuíram, basta solicitar o cancelamento dentro do prazo para não pagar absolutamente nada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS REALISTAS */}
      <section id="depoimentos" className="py-16 lg:py-24 border-b border-zinc-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Quem Usa Recomenda
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
              Barbearias que transformaram o sábado em lucro previsível
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800 bg-[#11141A] p-7 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex text-amber-400 gap-0.5" aria-label="5 de 5 estrelas">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">{item.result}</span>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/80">
                  <div className="text-sm font-bold text-white">{item.name}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {item.shop} • {item.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — PERGUNTAS FREQUENTES */}
      <section id="duvidas" className="py-16 lg:py-24 border-b border-zinc-900 bg-[#0C0F14]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Dúvidas Frequentes
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-800 bg-[#11141A] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-zinc-900/60 transition-colors"
                  >
                    <span className="text-sm sm:text-base font-bold text-white">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/60 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CONVERSION CTA */}
      <section className="py-16 lg:py-24 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
            Deixe a sua barbearia pronta para atender mais clientes já neste fim de semana
          </h2>
          <p className="text-base text-zinc-400 max-w-xl mx-auto">
            Crie seu link em vendaiapro.com.br em 2 minutos e teste grátis por 7 dias sem cadastrar cartão de crédito.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStartOnboarding}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-8 py-4 text-base font-extrabold text-zinc-950 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <span>Testar Grátis por 7 Dias</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={handleLoginClick}
              className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-6 py-4 text-sm font-semibold text-zinc-200 transition-colors cursor-pointer"
            >
              Já tenho conta — Entrar
            </button>
          </div>
        </div>
      </section>

      {/* QUIET PUBLIC FOOTER — ZERO ADMIN LINKS */}
      <footer className="border-t border-zinc-900 bg-[#07080B] py-8 px-4 sm:px-6 text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Scissors className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-white">BarberOS</span>
            <span>•</span>
            <span>vendaiapro.com.br</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <button onClick={() => scrollTo('como-funciona')} className="hover:text-zinc-300 cursor-pointer">
              Como Funciona
            </button>
            <button onClick={() => scrollTo('recursos')} className="hover:text-zinc-300 cursor-pointer">
              Recursos
            </button>
            <button onClick={() => scrollTo('planos')} className="hover:text-zinc-300 cursor-pointer">
              Planos
            </button>
            <button onClick={() => scrollTo('duvidas')} className="hover:text-zinc-300 cursor-pointer">
              Dúvidas
            </button>
          </div>

          <div>
            © {new Date().getFullYear()} BarberOS • vendaiapro.com.br
          </div>
        </div>
      </footer>

      {/* DISCRETE FLOATING WHATSAPP LEAD RECOVERY BUTTON */}
      <a
        href={`https://wa.me/5511999999999?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Dúvidas? Fale conosco pelo WhatsApp"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-[#11141A]/95 hover:bg-emerald-500 text-zinc-100 hover:text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-xl backdrop-blur-md transition-all"
      >
        <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>Dúvidas? Fale conosco</span>
      </a>
    </div>
  );
};
