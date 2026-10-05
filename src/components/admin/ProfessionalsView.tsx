import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Plus,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  DollarSign,
  UserCheck,
  Award
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Professional, Service } from '../../types';

interface ProfessionalsViewProps {
  organization: Organization;
}

export const ProfessionalsView: React.FC<ProfessionalsViewProps> = ({ organization }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPercent, setCommissionPercent] = useState<number>(40);
  const [specialtiesStr, setSpecialtiesStr] = useState('');

  const loadData = () => {
    setProfessionals(StorageService.getProfessionals(organization.id));
    setServices(StorageService.getServices(organization.id));
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  const handleToggleActive = (prof: Professional) => {
    StorageService.updateProfessional(prof.id, { isActive: !prof.isActive });
    loadData();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const specialties = specialtiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    StorageService.createProfessional({
      organizationId: organization.id,
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: phone.replace(/\D/g, ''),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@barber.com`,
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
      specialties: specialties.length ? specialties : ['Corte Tradicional', 'Barba'],
      serviceIds: services.map((s) => s.id),
      commissionPercent: Number(commissionPercent) || 40,
      isActive: true,
      isAvailableToday: true,
      workingDays: [1, 2, 3, 4, 5, 6],
    });

    setName('');
    setPhone('');
    setEmail('');
    setSpecialtiesStr('');
    setCommissionPercent(40);
    setShowAddModal(false);
    loadData();
  };

  // Calculate commission total for each professional this month
  const transactions = StorageService.getTransactions(organization.id);

  const getCommissionsEarned = (profId: string) => {
    return transactions
      .filter((t) => t.professionalId === profId && t.type === 'COMMISSION')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Scissors className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Equipe de Profissionais & Barbeiros</h1>
            <p className="mt-1 text-xs text-slate-400">
              Controle de comissões individuais, serviços habilitados e agendas por cadeira.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition"
        >
          <Plus className="h-4 w-4" />
          <span>+ Cadastrar Profissional</span>
        </button>
      </div>

      {/* Grid of Professionals Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {professionals.map((prof) => {
          const commissionsTotal = getCommissionsEarned(prof.id);

          return (
            <div
              key={prof.id}
              className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                prof.isActive
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-950 border-slate-850 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={prof.avatarUrl}
                      alt={prof.name}
                      className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-800"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{prof.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-500" />
                        <span>{prof.phone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(prof)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                      prof.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {prof.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* Specialties */}
                <div className="mt-4 flex flex-wrap gap-1">
                  {prof.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-medium bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-850"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Metrics Box: Commission & Revenue */}
                <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Percent className="h-3 w-3 text-amber-400" />
                      Comissão
                    </span>
                    <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                      {prof.commissionPercent}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      Ganhos Acumulados
                    </span>
                    <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                      R$ {commissionsTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Commission Edit */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Alterar % Comissão:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={prof.commissionPercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    StorageService.updateProfessional(prof.id, { commissionPercent: val });
                    loadData();
                  }}
                  className="w-16 rounded-lg bg-slate-800 border border-slate-700 p-1 text-xs text-center text-white font-mono font-bold"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD PROFESSIONAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Scissors className="h-5 w-5 text-amber-400" />
              Cadastrar Novo Profissional
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Adicione um novo barbeiro ou cabeleireiro à sua equipe.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Matheus Navalha"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">WhatsApp / Telefone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Comissão (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="barbeiro@salão.com"
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Especialidades (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={specialtiesStr}
                  onChange={(e) => setSpecialtiesStr(e.target.value)}
                  placeholder="Ex: Corte Degradê, Barboterapia, Sobrancelha"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-md transition"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
