import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share2,
  PlusSquare,
  X,
  Sparkles
} from 'lucide-react';

interface PWATopPopupProps {
  organizationName?: string;
}

export const PWATopPopup: React.FC<PWATopPopupProps> = ({
  organizationName = 'Barbearia',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user previously closed this popup
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem('pwa_top_popup_dismissed_v2') ||
        sessionStorage.getItem('pwa_top_popup_dismissed_v2');
      if (stored === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  }, []);

  // Do not show if the app is already installed or if user clicked X to close
  if (isInstalled || isDismissed) {
    return null;
  }

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

  // When clicking X, the popup COMPLETELY disappears from the dashboard and never blocks again
  const handleClose = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('pwa_top_popup_dismissed_v2', 'true');
      sessionStorage.setItem('pwa_top_popup_dismissed_v2', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <>
      {/* Top Floating Pop-up Installer Card */}
      <div className="fixed top-2 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-50 animate-in slide-in-from-top-3 duration-300">
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/70 p-3 sm:p-3.5 shadow-2xl shadow-amber-500/20 backdrop-blur-md">
          {/* Top Amber Accent Glow Line */}
          <div className="absolute top-0 inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          <div className="flex items-center justify-between gap-2.5">
            {/* App Icon with neon pulse */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <Smartphone className="h-6 w-6 text-slate-950" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            {/* Text Info */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-xs sm:text-sm tracking-tight truncate">
                  Instalar App na Tela de Início
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 uppercase shrink-0">
                  Novo
                </span>
              </div>
              <p className="text-slate-300 text-[10px] sm:text-[11px] leading-tight line-clamp-2 mt-0.5">
                Acompanhe sua vez sem navegador aberto. O celular toca e vibra quando for sua vez!
              </p>
            </div>

            {/* Action & Close Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">{isInstalling ? 'Instalando...' : 'Instalar'}</span>
                <span className="xs:hidden">Instalar</span>
              </button>

              {/* X BUTTON: DISAPPEARS COMPLETELY */}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fechar e dispensar instalador"
                aria-label="Fechar pop-up"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari step-by-step installation guide */}
      {showIOSModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Adicionar à Tela de Início (iPhone)</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              No iPhone / iPad, adicione o app de fila à tela de início em apenas 3 toques:
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
                  1
                </div>
                <div>
                  <strong className="text-white block font-bold">Toque em Compartilhar</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Na barra inferior do Safari, toque no botão <Share2 className="inline h-3.5 w-3.5 text-blue-400" /> <strong>Compartilhar</strong> (quadrado com seta).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
                  3
                </div>
                <div>
                  <strong className="text-white block font-bold">Concluir</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O app fica salvo na tela inicial do celular.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 text-xs shadow-lg transition cursor-pointer"
            >
              Entendi, vou adicionar!
            </button>
          </div>
        </div>
      )}

      {/* Android/Generic installation guide */}
      {showGenericModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Instalar Aplicativo no Celular</h3>
              </div>
              <button
                onClick={() => setShowGenericModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Para instalar o aplicativo no seu celular Android ou computador:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">1. Abra no Google Chrome</strong>
                <p className="text-slate-400 text-[11px]">
                  Se abriu pelo WhatsApp ou Instagram, toque nos três pontinhos no canto superior e selecione <strong>"Abrir no Chrome"</strong>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">2. Menu ⋮ do Chrome</strong>
                <p className="text-slate-400 text-[11px]">
                  Toque nos três pontinhos <strong className="text-white">⋮</strong> e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGenericModal(false)}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 text-xs shadow-lg transition cursor-pointer"
            >
              Entendi!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
