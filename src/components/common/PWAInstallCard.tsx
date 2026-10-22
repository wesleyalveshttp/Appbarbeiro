import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share2,
  PlusSquare,
  X,
  BellRing,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PWAInstallCardProps {
  organizationName?: string;
  variant?: 'banner' | 'card' | 'compact';
}

export const PWAInstallCard: React.FC<PWAInstallCardProps> = ({
  organizationName = 'Barbearia',
  variant = 'card',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowGenericModal(true);
    }
  };

  // If running in standalone mode (already installed), show sleek confirmation badge
  if (isInstalled) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-slate-900 border border-emerald-500/30 p-3 text-xs flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-white text-[11px] block">App da Fila Instalado no Celular</span>
            <span className="text-[10px] text-emerald-300/90">Modo nativo ativo • Alertas com som e vibração em 2º plano</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-slate-950 uppercase shrink-0">
          Ativo
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition cursor-pointer transform active:scale-95"
          title="Baixar e instalar o aplicativo da fila no celular"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Baixar App</span>
        </button>

        {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} orgName={organizationName} />}
        {showGenericModal && <GenericModal onClose={() => setShowGenericModal(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-slate-900 border-2 border-amber-500/40 p-4 text-xs shadow-xl space-y-3 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
          <Smartphone className="h-28 w-28 text-amber-400" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="space-y-0.5 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm">Baixar App da Fila de Espera</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950 uppercase">
                Grátis
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Instale no seu celular para ver sua posição sem precisar do navegador. O celular toca e vibra mesmo com a tela bloqueada!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 py-2.5 px-4 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer transform active:scale-98 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-950" />
            <span>{isInstalling ? 'Instalando...' : 'Instalar App no Celular'}</span>
            <ArrowRight className="h-3.5 w-3.5 ml-auto text-slate-950/70" />
          </button>

          {isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 py-2.5 px-3 text-[11px] font-bold text-slate-200 transition cursor-pointer"
            >
              Como Instalar no iPhone
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Sem Play Store / App Store
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <BellRing className="h-3 w-3 text-amber-400" />
            Toque e Vibração Nativos
          </span>
        </div>
      </div>

      {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} orgName={organizationName} />}
      {showGenericModal && <GenericModal onClose={() => setShowGenericModal(false)} />}
    </>
  );
};

// Step-by-step modal for iPhone (Safari) users
const IOSModal: React.FC<{ onClose: () => void; orgName: string }> = ({ onClose, orgName }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in">
    <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Instalar no iPhone / iPad</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        No iPhone, o Safari permite adicionar o aplicativo diretamente à sua tela de início em 3 passos simples:
      </p>

      <div className="space-y-3 text-xs">
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs">
            1
          </div>
          <div>
            <strong className="text-white block font-bold">Toque em Compartilhar</strong>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Na barra inferior do navegador Safari, toque no ícone <Share2 className="inline h-3.5 w-3.5 text-blue-400" /> (quadrado com seta para cima).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs">
            2
          </div>
          <div>
            <strong className="text-white block font-bold">Adicionar à Tela de Início</strong>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Role a lista para baixo e toque em <PlusSquare className="inline h-3.5 w-3.5 text-emerald-400" /> <strong>"Adicionar à Tela de Início"</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs">
            3
          </div>
          <div>
            <strong className="text-white block font-bold">Concluir Instalação</strong>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Toque em <strong>"Adicionar"</strong> no canto superior direito. O ícone aparecerá junto aos seus outros apps!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 text-xs shadow-lg transition cursor-pointer"
      >
        Entendi, vou instalar agora!
      </button>
    </div>
  </div>
);

// Fallback guide modal for Android/Desktop if beforeinstallprompt is in cooldown or in-app browser
const GenericModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in">
    <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Instalar Aplicativo no Celular</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Para instalar o app de fila no seu celular Android ou computador:
      </p>

      <div className="space-y-2.5 text-xs">
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <strong className="text-white block font-bold">1. Abra no Chrome ou Edge</strong>
          <p className="text-slate-400 text-[11px]">
            Se você estiver dentro do navegador do WhatsApp ou Instagram, toque nos três pontinhos no canto superior e escolha <strong>"Abrir no Chrome"</strong>.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <strong className="text-white block font-bold">2. Toque no Menu (três pontinhos)</strong>
          <p className="text-slate-400 text-[11px]">
            No Google Chrome, toque no menu <strong className="text-white">⋮</strong> e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 text-xs shadow-lg transition cursor-pointer"
      >
        Entendi!
      </button>
    </div>
  </div>
);
