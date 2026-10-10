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
  Sliders,
  BellRing,
  Vibrate,
  Volume2,
  Menu,
  X
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
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'queue' | 'operational' | 'dashboard'>('queue');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const scrollTo = (id: string) => {
    setIsMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const showcaseItems = {
    queue: {
      title: 'Fila Virtual Inteligente no Celular do Cliente',
      tag: 'O Diferencial Principal do BarberOS',
      description: 'O cliente escaneia o QR Code no balcão ou acessa o link da barbearia de onde estiver. Acompanha sua posição exata (#1º, #2º, #3º...), quantidade de pessoas à frente e tempo estimado de espera.',
      image: '/src/assets/images/queue_mobile_mockup_1791313536444.jpg',
      highlights: [
        'Sem espera física no salão: cliente aguarda onde quiser',
        'Notificação push nativa com som e vibração no aparelho',
        '3 Avisos automáticos: Faltam 3 pessoas, Você é o próximo, Chegou sua vez!',
        'Botões de resposta direta: "Estou a caminho" ou "Preciso de +3 min"'
      ]
    },
    operational: {
      title: 'Painel do Barbeiro com Botão "Chamar Próximo"',
      tag: 'Velocidade Máxima na Bancada',
      description: 'Interface tátil otimizada para tablets e celulares nas cadeiras. Com um clique em "CHAMAR PRÓXIMO CLIENTE", o sistema atualiza a fila ao vivo e dispara o alerta sonoro e vibratório no celular do cliente.',
      image: '/src/assets/images/operational_barber_mockup_1791313549350.jpg',
      highlights: [
        'Botão gigante: CHAMAR PRÓXIMO CLIENTE com 1 toque',
        'Cronômetro de tolerância de comparecimento configurável (ex: 3 min)',
        'Bloqueio contra chamadas concorrentes entre múltiplos barbeiros',
        'Histórico operacional de clientes na cadeira, finalizados e desistências'
      ]
    },
    dashboard: {
      title: 'Painel de Gestão & Faturamento da Barbearia',
      tag: 'Visão Executiva em Tempo Real',
      description: 'Tenha controle absoluto do seu negócio. Acompanhe entradas diárias, faturamento mensal, comissões de cada barbeiro automatizadas e métricas de retenção de clientes.',
      image: '/src/assets/images/dashboard_mockup_1791313526248.jpg',
      highlights: [
        'Gráficos de faturamento diário, semanal e mensal com PIX e cartões',
        'Cálculo automatizado de comissões por profissional (ex: 40% ou 50%)',
        'Agendamento online 24/7 integrado como complemento à fila',
        'QR Codes em alta definição prontos para impressão no balcão'
      ]
    }
  };

  const currentItem = showcaseItems[activeShowcaseTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md">
            <Scissors className="h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-tight text-white">BarberOS</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Fila Virtual
          </span>
        </div>

        {/* Desktop Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <button onClick={() => scrollTo('demonstracao')} className="hover:text-amber-400 transition cursor-pointer">
            Fila ao Vivo
          </button>
          <button onClick={() => scrollTo('recursos')} className="hover:text-amber-400 transition cursor-pointer">
            Recursos
          </button>
          <button onClick={() => scrollTo('planos')} className="hover:text-amber-400 transition cursor-pointer">
            Planos & Preços
          </button>
          <button onClick={() => scrollTo('depoimentos')} className="hover:text-amber-400 transition cursor-pointer">
            Depoimentos
          </button>
          <button onClick={() => scrollTo('faq')} className="hover:text-amber-400 transition cursor-pointer">
            FAQ
          </button>
        </nav>

        {/* Top Right Action Buttons */}
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

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileNavOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-slate-950/95 px-6 py-4 space-y-3 backdrop-blur-md">
          <button
            onClick={() => scrollTo('demonstracao')}
            className="block w-full text-left text-xs font-semibold text-slate-300 py-2 hover:text-amber-400"
          >
            Fila Virtual ao Vivo
          </button>
          <button
            onClick={() => scrollTo('recursos')}
            className="block w-full text-left text-xs font-semibold text-slate-300 py-2 hover:text-amber-400"
          >
            Recursos do Sistema
          </button>
          <button
            onClick={() => scrollTo('planos')}
            className="block w-full text-left text-xs font-semibold text-slate-300 py-2 hover:text-amber-400"
          >
            Planos & Preços (12x R$ 69,90)
          </button>
          <button
            onClick={() => scrollTo('faq')}
            className="block w-full text-left text-xs font-semibold text-slate-300 py-2 hover:text-amber-400"
          >
            Perguntas Frequentes
          </button>
          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => {
                setIsMobileNavOpen(false);
                if (onOpenLogin) onOpenLogin('OWNER');
              }}
              className="flex-1 text-center py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
            >
              Fazer Login
            </button>
            <button
              onClick={() => {
                setIsMobileNavOpen(false);
                onStartOnboarding();
              }}
              className="flex-1 text-center py-2.5 rounded-xl bg-amber-500 text-xs font-bold text-slate-950"
            >
              Cadastrar Salão
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION (#Reformulation - Focus on Virtual Queue) */}
      <section className="relative overflow-hidden pt-16 pb-16 lg:pt-24 lg:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.18),rgba(255,255,255,0))]" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 mb-6">
            <BellRing className="h-3.5 w-3.5 animate-bounce" />
            <span>Fila Virtual Inteligente com Alerta Sonoro & Vibração no Celular</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl sm:leading-tight">
            O cliente entra na fila pelo celular.<br />
            <span className="text-amber-400">E só vai para o salão quando for a vez dele.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg leading-relaxed">
            Acabe com a aglomeração e a espera física na recepção. O cliente escaneia o QR Code, acompanha a posição e o tempo ao vivo, e o próprio aplicativo <strong>vibra e emite um alerta sonoro no celular</strong> assim que o barbeiro chamar!
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStartOnboarding}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-7 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
            >
              <span>Cadastrar Minha Barbearia Grátis</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenLogin ? onOpenLogin('OWNER') : onEnterDashboard()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 px-6 py-4 text-sm font-semibold text-slate-200 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-amber-400" />
              <span>Entrar na Minha Conta</span>
            </button>
          </div>

          {/* Live Feature Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Vibrate className="h-4 w-4 text-amber-400" />
              Vibração & Som no Celular
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Clock className="h-4 w-4 text-emerald-400" />
              Posição em Tempo Real
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <QrCode className="h-4 w-4 text-amber-400" />
              QR Code para Balcão
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Calendar className="h-4 w-4 text-blue-400" />
              Agendamentos Complementares
            </span>
          </div>
        </div>
      </section>

      {/* DEMONSTRAÇÃO DO SISTEMA */}
      <section id="demonstracao" className="py-20 border-t border-slate-900 bg-slate-950/80">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Demonstração Interativa</h2>
            <p className="mt-2 text-3xl font-black text-white">Como a Fila Virtual Funciona na Prática</p>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Uma experiência fluida tanto para os clientes no celular quanto para os barbeiros na bancada de atendimento.
            </p>
          </div>

          {/* Showcase Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 max-w-2xl mx-auto mb-10 shadow-lg">
            <button
              onClick={() => setActiveShowcaseTab('queue')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeShowcaseTab === 'queue'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>1. Fila no Celular do Cliente</span>
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
              <span>2. Chamada do Barbeiro</span>
            </button>

            <button
              onClick={() => setActiveShowcaseTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeShowcaseTab === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>3. Gestão do Dono</span>
            </button>
          </div>

          {/* Active Showcase Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden group transition">
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
                  <span>Ativar Fila na Minha Barbearia</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => onOpenLogin ? onOpenLogin('OWNER') : onEnterDashboard()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span>Acessar Painel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS COMPLETOS */}
      <section id="recursos" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Recursos Exclusivos</h2>
            <p className="mt-2 text-3xl font-black text-white">Criado para Modernizar o Atendimento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3 relative overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Fila Virtual em Tempo Real</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Atualização dinâmica de posição, pessoas à frente e estimativa de tempo sem precisar recarregar a página.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Vibrate className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Notificações Nativas com Vibração</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O aparelho do cliente vibra e toca um sinal sonoro diretamente pelo app quando estiver na hora de comparecer.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Painel da Bancada (1 Toque)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Botão grande para o barbeiro chamar o próximo cliente, cronômetro de tolerância e confirmação de chegada.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Agendamento Complementar 24/7</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Além da fila diária, seus clientes também podem marcar serviços com antecedência de acordo com a agenda.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Comissões & Financeiro</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controle de comissões por barbeiro (ex: 40%), entradas diárias via PIX e dinheiro, e fluxo de caixa completo.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">QR Codes Prontos para Impressão</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gere cartazes para espelho e balcão para os clientes entrarem na fila instantaneamente com a câmera do celular.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS SaaS SECTION (#Planos - Plano Anual 12x 69,90 e Plano Mensal 79,90) */}
      <section id="planos" className="py-20 border-t border-slate-900">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Planos & Preços Simples</h2>
            <p className="text-3xl font-black text-white">Escolha a Melhor Opção para Seu Salão</p>
            <p className="text-xs text-slate-400">
              Acesso 100% completo a todas as funcionalidades de fila virtual, agendamento, cadeiras e financeiro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* PLANO MENSAL */}
            <div className="rounded-3xl p-8 bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">Plano Pro Mensal</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Mês a Mês
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">Pagamento mensal flexível sem fidelidade.</p>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-xs text-slate-400">R$</span>
                  <span className="text-4xl font-black text-white font-mono">79,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Fila Virtual com Posição ao Vivo no Celular</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Notificações Nativas com Som e Vibração</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Painel das Cadeiras (Bancada do Barbeiro)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Profissionais e cadeiras ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>QR Codes personalizados prontos para balcão</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onStartOnboarding}
                className="mt-8 w-full rounded-2xl py-3.5 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-white transition cursor-pointer"
              >
                Começar com Plano Mensal
              </button>
            </div>

            {/* PLANO ANUAL (12x 69,90 - DESTAQUE ESPECIAL) */}
            <div className="rounded-3xl p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/70 flex flex-col justify-between shadow-2xl ring-2 ring-amber-500/30 relative">
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] uppercase font-black tracking-wider shadow-lg">
                🔥 MAIS ESCOLHIDO • ECONOMIZE R$ 120/ANO
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">Plano Pro Anual</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    12x R$ 69,90
                  </span>
                </div>
                <p className="text-xs text-amber-300/90 mb-6">Pague em 12x no cartão ou PIX anual com economia real.</p>

                <div className="mb-2 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-amber-400">12x</span>
                  <span className="text-xs text-slate-400">R$</span>
                  <span className="text-5xl font-black text-amber-400 font-mono tracking-tight">69,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mb-6">
                  Economia de R$ 120,00 no ano (Total de R$ 838,80/ano)
                </div>

                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Todas as ferramentas 100% liberadas</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Fila Virtual Inteligente sem aglomeração física</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Alertas com vibração e som direto no aparelho do cliente</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Preço promocional congelado por 1 ano inteiro</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Suporte prioritário via WhatsApp com o desenvolvedor</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onStartOnboarding}
                className="mt-8 w-full rounded-2xl py-4 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
              >
                Começar com Plano Anual (12x R$ 69,90)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-20 border-t border-slate-900 bg-slate-950/60">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-wider text-amber-400">Depoimentos Reais</h2>
            <p className="mt-2 text-3xl font-black text-white">Quem usa a Fila Virtual Aprova</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "A fila virtual acabou com as brigas no sábado. O cliente escaneia o QR Code no balcão e vai tomar um café. Quando clico em Chamar Próximo, o celular dele apita e ele vem na hora."
              </p>
              <div className="text-xs font-bold text-white">
                — Rodrigo C., Barbearia Dom Navalha / SP
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "O plano anual de 12x 69,90 se paga sozinho na primeira semana. Meus barbeiros amam o botão de Chamar na bancada porque elimina papelada e agiliza os cortes."
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
              <h4 className="font-bold text-white text-sm mb-1">Como a notificação funciona sem depender de WhatsApp?</h4>
              <p className="text-slate-400 leading-relaxed">
                Utilizamos o sistema de notificações push nativas com suporte a áudio e vibração. Quando o cliente entra na fila, ele autoriza as notificações com 1 toque e o aparelho é alertado automaticamente quando for chamado.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-1">O que acontece se o cliente não comparecer ao ser chamado?</h4>
              <p className="text-slate-400 leading-relaxed">
                O sistema possui um cronômetro de tolerância (ex: 3 minutos). O cliente pode responder "Estou a caminho" ou "Preciso de +3 minutos". Se o tempo expirar, o barbeiro pode marcar como não compareceu e chamar o próximo da fila.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-1">Como assinar o plano anual de 12x R$ 69,90?</h4>
              <p className="text-slate-400 leading-relaxed">
                Ao cadastrar sua barbearia, você tem acesso imediato. No painel, você pode escolher o pagamento mensal de R$ 79,90 ou o plano anual em 12x de R$ 69,90 com desconto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 border-t border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900 text-center">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Pronto para revolucionar o atendimento do seu salão?
          </h2>
          <p className="text-sm text-slate-400">
            Cadastre seu estabelecimento em menos de 2 minutos e comece a usar a fila virtual hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartOnboarding}
              className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-400 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
            >
              Criar Minha Barbearia Agora
            </button>
            <button
              onClick={() => onOpenLogin ? onOpenLogin('OWNER') : onEnterDashboard()}
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
            <span>· Fila Virtual Inteligente para Barbearias e Salões</span>
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
