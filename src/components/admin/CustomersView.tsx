import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Calendar,
  DollarSign,
  Download,
  Scissors,
  Star,
  Clock,
  ArrowRight,
  MessageCircle,
  FileText
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Customer, Appointment, Professional, Service } from '../../types';
import { WhatsAppService } from '../../services/whatsapp';

interface CustomersViewProps {
  organization: Organization;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ organization }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadData = () => {
    setCustomers(StorageService.getCustomers(organization.id));
    setAppointments(StorageService.getAppointments(organization.id));
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

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.whatsapp && c.whatsapp.includes(q))
    );
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Nome', 'Telefone', 'WhatsApp', 'Total Atendimentos', 'Total Gasto (R$)', 'Última Visita'];
    const rows = customers.map((c) => [
      c.id,
      `"${c.name}"`,
      c.phone,
      c.whatsapp || '',
      c.totalAppointments,
      c.totalSpent.toFixed(2),
      c.lastVisit || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clientes-${organization.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCustomerAppointments = (custId: string) => {
    return appointments
      .filter((a) => a.customerId === custId)
      .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Clientes & CRM</h1>
            <p className="mt-1 text-xs text-slate-400">
              Histórico detalhado, frequência de visitas, preferências e gastos dos clientes.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition"
        >
          <Download className="h-4 w-4 text-amber-400" />
          <span>Exportar Clientes (.CSV)</span>
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome, telefone ou WhatsApp..."
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Total de <strong className="text-amber-400 font-mono">{filteredCustomers.length}</strong> clientes cadastrados
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Nenhum cliente encontrado com os termos pesquisados.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 uppercase text-[10px] tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Atendimentos</th>
                  <th className="py-3.5 px-4">Total Gasto</th>
                  <th className="py-3.5 px-4">Preferências</th>
                  <th className="py-3.5 px-4">Última Visita</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((cust) => {
                  const favProf = professionals.find((p) => p.id === cust.favoriteProfessionalId);
                  const favSrv = services.find((s) => s.id === cust.favoriteServiceId);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{cust.name}</div>
                        {cust.notes && (
                          <div className="text-[11px] text-amber-400/80 truncate max-w-xs mt-0.5">
                            Nota: {cust.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono">{cust.phone}</div>
                        <a
                          href={WhatsAppService.getWhatsAppDirectLink(cust.phone, `Olá, ${cust.name}! Tudo bem?`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Conversar no WhatsApp
                        </a>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                          {cust.totalAppointments} visitas
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        R$ {cust.totalSpent.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-300">
                          {favProf ? <span>Barbeiro: {favProf.name}</span> : <span>Sem preferência</span>}
                        </div>
                        {favSrv && (
                          <div className="text-[10px] text-slate-500">{favSrv.name}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {cust.lastVisit || 'Nunca compareceu'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                        >
                          Ver Histórico
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CUSTOMER PROFILE DRAWER / MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  CRM · Perfil do Cliente
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total de Visitas</span>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {selectedCustomer.totalAppointments}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Investido</span>
                <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                  R$ {selectedCustomer.totalSpent.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {selectedCustomer.notes && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs shrink-0">
                <strong className="text-amber-300">Observações & Preferências:</strong>
                <p className="text-slate-300 mt-1">{selectedCustomer.notes}</p>
              </div>
            )}

            {/* Full History Section */}
            <div className="mt-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Histórico de Atendimentos Anteriores
              </h4>

              <div className="space-y-2">
                {getCustomerAppointments(selectedCustomer.id).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Nenhum atendimento registrado ainda para este cliente.
                  </div>
                ) : (
                  getCustomerAppointments(selectedCustomer.id).map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{apt.serviceName}</div>
                        <div className="text-[11px] text-slate-400">
                          {apt.date} às {apt.time} · Barbeiro: {apt.professionalName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">
                          R$ {apt.servicePrice.toFixed(2)}
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
