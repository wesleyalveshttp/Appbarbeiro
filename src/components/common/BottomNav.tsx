import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Armchair,
  Users,
  Menu
} from 'lucide-react';
import { UserRole } from '../../types';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenMenu: () => void;
  currentRole: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenMenu,
  currentRole,
}) => {
  if (currentRole === 'CLIENT') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-950/95 px-2 backdrop-blur-lg md:hidden">
        <button
          onClick={() => onNavigate('client-portal')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            currentRoute === 'client-portal' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span>Agendamentos</span>
        </button>
        <button
          onClick={() => onNavigate('fila')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            currentRoute === 'fila' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Clock className="h-5 w-5" />
          <span>Fila</span>
        </button>
        <button
          onClick={() => onNavigate('landing')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            currentRoute === 'landing' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Início</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-950/95 px-2 backdrop-blur-lg md:hidden">
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
          currentRoute === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>Início</span>
      </button>

      <button
        onClick={() => onNavigate('agenda')}
        className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
          currentRoute === 'agenda' ? 'text-amber-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Calendar className="h-5 w-5" />
        <span>Agenda</span>
      </button>

      {/* Prominent Center Action: Operacional / Modo Barbearia */}
      <button
        onClick={() => onNavigate('operacional')}
        className="flex flex-col items-center justify-center -mt-4 relative"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition ${
            currentRoute === 'operacional'
              ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20'
              : 'bg-amber-500 text-slate-950'
          }`}
        >
          <Armchair className="h-6 w-6" />
        </div>
        <span className="text-[10px] font-semibold text-amber-300 mt-1">Cadeiras</span>
      </button>

      <button
        onClick={() => onNavigate('fila')}
        className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
          currentRoute === 'fila' ? 'text-amber-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Clock className="h-5 w-5" />
        <span>Fila</span>
      </button>

      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-white"
      >
        <Menu className="h-5 w-5" />
        <span>Mais</span>
      </button>
    </nav>
  );
};
