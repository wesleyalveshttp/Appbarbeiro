import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {}
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      {isInstallable && (
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/20 px-4 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Instale o aplicativo BarberOS para agilidade total no seu celular</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={install}
              className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1 font-semibold text-slate-950 hover:bg-amber-400 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Instalar App
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fechar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {isIOS && !isInstallable && (
        <div className="flex items-center justify-between gap-3 bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Usando iPhone/iPad? Adicione o app na sua tela de início</span>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 transition"
          >
            Como instalar
          </button>
        </div>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-white">Instalar no iPhone / Safari</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                  1
                </div>
                <p>
                  Toque no botão <Share2 className="inline h-4 w-4 text-blue-400" /> <strong>Compartilhar</strong> na barra inferior do Safari.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                  2
                </div>
                <p>
                  Role para baixo e selecione <PlusSquare className="inline h-4 w-4 text-emerald-400" /> <strong>Adicionar à Tela de Início</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                  3
                </div>
                <p>Toque em <strong>Adicionar</strong> no canto superior direito.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
