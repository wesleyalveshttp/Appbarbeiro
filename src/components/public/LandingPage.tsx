import React, { useState } from 'react';
import {
  Scissors,
  Clock,
  Calendar,
  Users,
  DollarSign,
  QrCode,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  ChevronDown,
  Star,
  LogIn,
  LayoutDashboard,
  Eye,
  Sliders
} from 'lucide-react';
import { SaaSPlan } from '../../types';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onEnterDashboard: () => void;
  onEnterSuperAdmin?: () => void;
  onOpenLogin?: (tab?: 'OWNER' | 'SUPER_ADMIN') => void;
  plans: SaaSPlan[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onEnterDashboard,
  onEnterSuperAdmin,
  onOpenLogin,
  plans,
}) => {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'dashboard' | 'queue' | 'operational'>('dashboard');

  const showcaseItems = {
    dashboard: {
      title: 'Painel do Dono & Gestão Financeira',
      tag: 'Visão Executiva em Tempo Real',
      description: 'Tenha controle absoluto do seu negócio. Acompanhe receita diária, faturamento mensal, ticket médio, taxa de ocupação das cadeiras e relatórios de comissão automatizados sem complicação.',
      image: '/src/assets/images/dashboard_mockup_1791313526248.jpg',
      highlights: [
        'Gráficos de faturamento diário, semanal e mensal',
        'Controle automatizado de comissões por barbeiro',
        'Relatório de serviços mais lucrativos e horários de pico',
        'Fluxo de caixa completo com entradas PIX e cartões'
      ]
    },
    queue: {
      title: 'Fila de Espera Digital no Celular',
      tag: 'Experiência VIP para os Clientes',
      description: 'Acabe com o tumulto e clientes impacientes na recepção. O cliente escaneia o QR Code no balcão e acompanha a posição na fila e os minutos restantes pelo próprio smartphone.',
      image: '/src/assets/images/queue_mobile_mockup_1791313536444.jpg',
      highlights: [
        'Estimativa inteligente de tempo em minutos ao vivo',
        'O cliente não precisa baixar app nem criar senha',
        'Chamada automática para a cadeira do profissional',
        'QR Code personalizado pronto para impressão em alta definição'
      ]
    },
    operational: {
      title: 'Modo Barbearia das Cadeiras (Bancada)',
      tag: 'Velocidade Máxima na Rotina',
      description: 'Interface rápida e intuitiva projetada especificamente para tablets e celulares na bancada de atendimento. Kanban operacional com botões táteis para início e término de corte em 1 toque.',
      image: '/src/assets/images/operational_barber_mockup_1791313549350.jpg',
      highlights: [
        'Quatro colunas dinâmicas: Fila, Na Cadeira, Finalizando e Pago',
        'Botões gigantes e contraste perfeito para uso prático',
        'Seleção de barbeiro com cálculo de comissão instantâneo',
        'Histórico do cliente e anotações de corte salvas na hora'
      ]
    }
  };

  const currentItem = showcaseItems[activeShowcaseTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md">
            <Scissors className="h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-tight text-white">BarberOS</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            SaaS
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <a href="#demonstracao" className="hover:text-amber-400 transition">Demonstração</a>
          <a href="#recursos" className="hover:text-amber-400 transition">Recursos</a>
          <a href="#planos" className="hover:text-amber-400 transition">Planos</a>
          <a href="#depoimentos" className="hover:text-amber-400 transition">Depoimentos</a>
          <a href="#faq" className="hover:text-amber-400 transition">FAQ</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenLogin ? (
            <button
              onClick={() => onOpenLogin('SUPER_ADMIN')}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer"
              title="Acessar Painel do Dono da Plataforma com Senha"
            >
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              <span>Dono SaaS</span>
            </button>
          ) : onEnterSuperAdmin ? (
            <button
              onClick={onEnterSuperAdmin}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer"
              title="Acessar Painel do Dono da Plataforma"
            >
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              <span>Dono SaaS</span>
            </button>
          ) : null}

          <button
            onClick={() => onOpenLogin ? onOpenLogin('OWNER') : onEnterDashboard()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-850 transition cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5 text-amber-400" />
            <span>Login / Entrar</span>
          </button>
          <button
            onClick={onStartOnboarding}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            Começar Agora
          </button>
        </div>
      </header>

      {/* HERO SECTION (#7) */}
      <section className="relative overflow-hidden pt-16 pb-16 lg:pt-24 lg:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            A Plataforma SaaS Definitiva para Barbearias e Salões
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl sm:leading-tight">
            Seu salão organizado.<br />
            <span className="text-amber-400">Seus clientes mais satisfeitos.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
            Agendamentos online, fila de espera digital em tempo real, controle de profissionais, clientes e financeiro em um só lugar.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStartOnboarding}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer"
            >
              <span>Cadastrar Minha Barbearia Grátis</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenLogin ? onOpenLogin('OWNER') : onEnterDashboard()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 px-6 py-3.5 text-sm font-medium text-slate-200 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-amber-400" />
              <span>Entrar na Minha Conta</span>
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span>✓ Sistema Pronto para Operar</span>
            <span>·</span>
            <span>✓ Fila com Estimativa ao Vivo</span>
            <span>·</span>
            <span>✓ Aplicativo Mobile & Tablet</span>
            <span>·</span>
            <span>✓ PIX & Cartão Integrados</span>
          </div>
        </div>
      </section>

      {/* DEMONSTRAÇÃO DO SISTEMA (#IMAGENS DO APP) */}
      <section id="demonstracao" className="py-20 border-t border-slate-900 bg-slate-950/80">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Demonstração do Sistema</h2>
            <p className="mt-2 text-3xl font-black text-white">Conheça o BarberOS por Dentro</p>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Veja telas reais do sistema projetadas com visual escuro elegante, botões de alta resposta e fluxo operacional perfeito.
            </p>
          </div>

          {/* Showcase Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 max-w-2xl mx-auto mb-10 shadow-lg">
            <button
              onClick={() => setActiveShowcaseTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeShowcaseTab === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Painel do Dono</span>
            </button>

            <button
              onClick={() => setActiveShowcaseTab('queue')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeShowcaseTab === 'queue'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Fila no Celular</span>
            </button>

            <button
              onClick={() => setActiveShowcaseTab('operational')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeShowcaseTab === 'operational'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Modo Barbearia (Bancada)</span>
            </button>
          </div>

          {/* Active Showcase Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 sm:p-8 lg:p-10 shadow-2xl">
            {/* Image Preview Box with Browser Frame */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden group transition">
                {/* Mock Window Top Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 font-medium">
                    app.barberos.com.br / {activeShowcaseTab}
                  </div>
                  <div className="h-2.5 w-2.5" />
                </div>

                {/* Screenshot Image Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                  <img
                    src={currentItem.image}
                    alt={currentItem.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center transform group-hover:scale-102 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Content & Feature Highlights */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                  {currentItem.tag}
                </span>
                <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {currentItem.title}
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {currentItem.description}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                {currentItem.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={onStartOnboarding}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  <span>Ativar no Meu Salão</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={onEnterDashboard}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span>Acessar Painel Agora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS GRID (#7) */}
      <section id="recursos" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Recursos Completos</h2>
            <p className="mt-2 text-3xl font-black text-white">Tudo o que sua barbearia precisa para faturar mais</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Agendamento Online 24/7</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seus clientes escolhem profissional, serviço e horário sem atritos, com link direto ou QR Code no balcão.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3 relative overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Fila de Espera Digital em Tempo Real</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Quando não houver horário, o cliente entra na fila e acompanha sua posição e tempo restante pelo celular.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Gestão Financeira & Comissões</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cálculo automático de comissões por barbeiro (ex: 40%), controle de PIX, cartões e despesas diárias.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">CRM & Histórico do Cliente</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Saiba a frequência de cada cliente, preferências de corte, total investido e anotações personalizadas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">QR Codes para Impressão</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gere cartazes para balcão, espelho ou vitrine para escanear a fila ou agendamento instantaneamente.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Modo Barbearia Operacional</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kanban de 4 colunas com botões gigantes projetado para agilidade no tablet ou celular na bancada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS SaaS SECTION (#44) */}
      <section id="planos" className="py-20 border-t border-slate-900">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Planos & Preços</h2>
            <p className="mt-2 text-3xl font-black text-white">Comece grátis e escale seu faturamento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-6 flex flex-col justify-between border transition ${
                  p.popular
                    ? 'bg-slate-900 border-amber-500/50 shadow-xl ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    {p.popular && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Mais Escolhido
                      </span>
                    )}
                  </div>

                  <div className="mt-4 mb-6 flex items-baseline gap-1">
                    <span className="text-xs text-slate-400">R$</span>
                    <span className="text-3xl font-black text-white font-mono">
                      {p.priceMonthly.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-slate-400">/mês</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={onStartOnboarding}
                  className={`mt-8 w-full rounded-xl py-3 text-xs font-bold transition cursor-pointer ${
                    p.popular
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  Começar com {p.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS (#7) */}
      <section id="depoimentos" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Depoimentos Reais</h2>
            <p className="mt-2 text-3xl font-black text-white">Quem usa, não troca por nada</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "A fila digital transformou meu salão no sábado. Os clientes não ficam aglomerados na recepção e sabem exatamente quando é a vez de sentar. Meu faturamento subiu 35% no primeiro mês."
              </p>
              <div className="text-xs font-bold text-white">
                — Rodrigo C., Proprietário de Barbearia em São Paulo / SP
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "O painel operacional no tablet da bancada eliminou os caderninhos e as brigas por comissão. Agora tudo é registrado na hora em que o cliente levanta da cadeira."
              </p>
              <div className="text-xs font-bold text-white">
                — Marcos F., Mestre Barbeiro e Gestor
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 border-t border-slate-900">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Tire suas dúvidas</h2>
            <p className="mt-2 text-3xl font-black text-white">Perguntas Frequentes</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-1">O cliente precisa baixar aplicativo ou criar senha?</h4>
              <p className="text-slate-400 leading-relaxed">
                Não! O cliente só abre o link no WhatsApp ou escaneia o QR Code, informa o nome e WhatsApp e pronto. Simples e rápido.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-1">Como funciona a estimativa da fila?</h4>
              <p className="text-slate-400 leading-relaxed">
                Nosso algoritmo analisa a quantidade de pessoas à frente, a média de duração dos serviços solicitados e a quantidade de barbeiros atendendo no momento para fornecer um tempo aproximado em tempo real.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-1">Como o dono da barbearia ativa o sistema 100%?</h4>
              <p className="text-slate-400 leading-relaxed">
                Basta realizar a assinatura mensal de R$ 79,90 via PIX ou cartão no painel. O dono da plataforma confirma o pagamento e seu acesso é liberado instantaneamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA (#7) */}
      <section className="py-20 border-t border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900 text-center">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Pronto para revolucionar a gestão da sua barbearia?
          </h2>
          <p className="text-sm text-slate-400">
            Cadastre seu estabelecimento em menos de 2 minutos e comece a receber agendamentos hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartOnboarding}
              className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-400 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
            >
              Criar Minha Barbearia Agora
            </button>
            <button
              onClick={onEnterDashboard}
              className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-6 py-3.5 text-sm font-medium text-slate-200 transition cursor-pointer"
            >
              Acessar Painel Existente
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-white">BarberOS</span>
            <span>· Sistema Profissional para Barbearias e Salões</span>
          </div>

          <div className="flex items-center gap-4">
            {onEnterSuperAdmin && (
              <button
                onClick={onEnterSuperAdmin}
                className="text-purple-400 hover:text-purple-300 font-medium transition cursor-pointer"
              >
                Painel do Dono da SaaS (Super Admin)
              </button>
            )}
            <span>© {new Date().getFullYear()} BarberOS. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
