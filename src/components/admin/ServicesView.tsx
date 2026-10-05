import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Clock,
  DollarSign,
  Tag,
  CheckCircle,
  XCircle,
  Scissors
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Service, Professional } from '../../types';

interface ServicesViewProps {
  organization: Organization;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ organization }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(45);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [category, setCategory] = useState('Cabelo');

  const loadData = () => {
    setServices(StorageService.getServices(organization.id));
    setProfessionals(StorageService.getProfessionals(organization.id));
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  const handleToggleActive = (srv: Service) => {
    StorageService.updateService(srv.id, { isActive: !srv.isActive });
    loadData();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    StorageService.createService({
      organizationId: organization.id,
      name: name.trim(),
      description: description.trim() || 'Serviço profissional de alta qualidade.',
      price: Number(price) || 40,
      durationMinutes: Number(durationMinutes) || 30,
      category,
      professionalIds: professionals.map((p) => p.id),
      isActive: true,
    });

    setName('');
    setDescription('');
    setPrice(45);
    setDurationMinutes(30);
    setShowAddModal(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Catálogo de Serviços & Tabela de Preços</h1>
            <p className="mt-1 text-xs text-slate-400">
              Configure durações para cálculo automático da disponibilidade e valores cobrados.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition"
        >
          <Plus className="h-4 w-4" />
          <span>+ Cadastrar Serviço</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((srv) => (
          <div
            key={srv.id}
            className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
              srv.isActive ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-850 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {srv.category}
                </span>

                <button
                  onClick={() => handleToggleActive(srv)}
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition ${
                    srv.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {srv.isActive ? 'Ativo' : 'Pausado'}
                </button>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{srv.name}</h3>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{srv.description}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{srv.durationMinutes} minutos</span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-xs text-slate-400">R$</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {srv.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD SERVICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Novo Serviço
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Cadastre um serviço que ficará disponível para agendamento online e na recepção.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Degradê + Hidratação"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Descrição</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes do que está incluso no serviço..."
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Duração (Minutos) *</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Cabelo">Cabelo</option>
                  <option value="Barba">Barba</option>
                  <option value="Combos">Combos</option>
                  <option value="Tratamentos">Tratamentos</option>
                  <option value="Rosto / Estética">Rosto / Estética</option>
                  <option value="Outros">Outros</option>
                </select>
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
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
