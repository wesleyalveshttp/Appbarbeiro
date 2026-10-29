import React, { useState, useEffect } from 'react';
import {
  Zap,
  Armchair,
  Scissors,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bot,
  BellRing,
  Volume2,
  Settings,
  UserCheck
} from 'lucide-react';
import { Organization, Professional, Appointment, WaitingQueueItem } from '../../types';
import { AutoPilotService, AutoPilotLog } from '../../services/autoPilot';

interface AutoPilotChairsBarProps {
  organization: Organization;
  professionals: Professional[];
  onChairAppointments: Appointment[];
  onChairQueue: WaitingQueueItem[];
  nextCandidate: {
    type: 'APPOINTMENT' | 'QUEUE';
    name: string;
    serviceName: string;
    ticketNumber?: number;
    time?: string;
    id: string;
    raw: any;
  } | null;
  onSeatNext: (candidate: any, professionalId: string) => void;
  onFinishChair: (item: {
    id: string;
    type: 'APPOINTMENT' | 'QUEUE';
    name: string;
    serviceName: string;
    servicePrice: number;
    professionalName: string;
    professionalId: string;
  }) => void;
}

export const AutoPilotChairsBar: React.FC<AutoPilotChairsBarProps> = ({
  organization,
  professionals,
  onChairAppointments,
  onChairQueue,
  nextCandidate,
  onSeatNext,
  onFinishChair,
}) => {
  const [logs, setLogs] = useState<AutoPilotLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isAutoPilotActive, setIsAutoPilotActive] = useState<boolean>(
    organization.settings?.autoPilotEnabled !== false
  );

  useEffect(() => {
    // Start autonomous cycle
    AutoPilotService.startAutoPilot(organization, 12000);
    setLogs(AutoPilotService.getLogs(organization.id));

    const unsub = AutoPilotService.subscribe((updatedLogs) => {
      setLogs([...updatedLogs]);
    });

    return () => {
      unsub();
      AutoPilotService.stopAutoPilot(organization.id);
    };
  }, [organization.id]);

  const activeProfs = professionals.filter(p => p.isActive);
  const totalChairs = Math.max(1, activeProfs.length);

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-5 shadow-2xl space-y-4">
      {/* Top Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                PILOTO AUTOMÁTICO 100% ATIVO
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Operando Sozinho
              </span>
            </div>
            <p className="text-xs text-slate-300">
              O app avisa os clientes com 15 min de antecedência e organiza a fila sozinho. <strong className="text-amber-400">Sua única tarefa é sentar o cliente e finalizar o corte!</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{logs.length} Ações Automáticas</span>
              {showLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Fila & 15min Automáticos</span>
          </div>
        </div>
      </div>

      {/* Autonomous Action Logs (Collapsible) */}
      {showLogs && logs.length > 0 && (
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800">
            <span>Últimas ações autônomas realizadas pelo app</span>
            <span>Hoje</span>
          </div>
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center justify-between py-1 border-b border-slate-900/60 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {log.timestamp}
                </span>
                <span className="text-white font-medium">{log.title}:</span>
                <span className="text-slate-300">{log.description}</span>
              </div>
              {log.whatsappUrl && (
                <a
                  href={log.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 underline shrink-0 ml-2"
                >
                  Ver no Whats
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CHAIRS FAST-TRACK BAR: 1 CLICK TO SEAT, 1 CLICK TO FINISH */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeProfs.map((prof, index) => {
          // Check if this professional currently has someone on the chair
          const chairApt = onChairAppointments.find(a => a.professionalId === prof.id);
          const chairQueue = onChairQueue.find((q: any) => q.assignedProfessionalId === prof.id || q.professionalId === prof.id);
          const isOccupied = !!(chairApt || chairQueue);

          const occupiedItem = chairApt
            ? {
                id: chairApt.id,
                type: 'APPOINTMENT' as const,
                name: chairApt.customerName,
                serviceName: chairApt.serviceName,
                servicePrice: chairApt.servicePrice || 35,
                professionalName: prof.name,
                professionalId: prof.id,
                startedAt: chairApt.date,
              }
            : chairQueue
            ? {
                id: chairQueue.id,
                type: 'QUEUE' as const,
                name: chairQueue.customerName,
                serviceName: chairQueue.serviceName,
                servicePrice: chairQueue.servicePrice || 35,
                professionalName: prof.name,
                professionalId: prof.id,
                startedAt: chairQueue.joinedAt,
              }
            : null;

          return (
            <div
              key={prof.id}
              className={`rounded-2xl p-4 border transition-all ${
                isOccupied
                  ? 'bg-blue-950/30 border-blue-500/40 shadow-lg'
                  : 'bg-emerald-950/20 border-emerald-500/40 shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${
                      isOccupied ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    <Armchair className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase">Cadeira {index + 1}</h3>
                    <p className="text-[11px] text-slate-400">{prof.name}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isOccupied
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isOccupied ? 'Cortando Agora' : 'Cadeira Livre'}
                </span>
              </div>

              {/* ACTION 1: IF OCCUPIED -> ONLY 1 BUTTON TO FINISH CUT */}
              {isOccupied && occupiedItem ? (
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{occupiedItem.name}</span>
                      <span className="text-amber-400">R$ {occupiedItem.servicePrice.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{occupiedItem.serviceName}</p>
                  </div>

                  <button
                    onClick={() => onFinishChair(occupiedItem)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 py-3 px-4 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>FINALIZAR CORTE & RECEBER</span>
                  </button>
                </div>
              ) : (
                /* ACTION 2: IF EMPTY -> ONLY 1 BUTTON TO SEAT NEXT CLIENT */
                <div className="space-y-3 pt-2">
                  {nextCandidate ? (
                    <>
                      <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800 text-xs">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          Próximo a sentar:
                        </span>
                        <div className="flex items-center justify-between font-bold text-white mt-0.5">
                          <span>
                            {nextCandidate.name} {nextCandidate.ticketNumber ? `(#${nextCandidate.ticketNumber})` : ''}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {nextCandidate.type === 'APPOINTMENT' ? `Horário ${nextCandidate.time}` : 'Fila Virtual'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{nextCandidate.serviceName}</p>
                      </div>

                      <button
                        onClick={() => onSeatNext(nextCandidate, prof.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 py-3 px-4 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-98 animate-pulse hover:animate-none"
                      >
                        <Scissors className="h-4 w-4" />
                        <span>COLOCAR NA CADEIRA (INICIAR)</span>
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl bg-slate-950/40 p-4 border border-dashed border-slate-800 text-center">
                      <p className="text-xs text-slate-400 font-medium">Nenhum cliente aguardando no momento.</p>
                      <p className="text-[11px] text-slate-500 mt-1">O Piloto Automático sentará o próximo assim que chegar!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
