import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 selection:bg-amber-500 selection:text-slate-950 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto shadow-inner">
              <AlertCircle className="h-8 w-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white tracking-tight">BarberOS - Fila Virtual</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ocorreu uma pequena instabilidade na conexão ou na tela. Seus dados e posição na fila permanecem salvos em segurança no servidor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 px-4 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recarregar Tela</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 px-4 text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
