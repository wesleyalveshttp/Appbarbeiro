import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Star,
  Phone,
  Instagram,
  ArrowRight,
  Sparkles,
  QrCode,
  Share2
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Professional, Service, Review } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';
import { WhatsAppService } from '../../services/whatsapp';

interface PublicStorefrontProps {
  slug: string;
  onNavigateToBooking: (slug: string) => void;
  onNavigateToQueue: (slug: string) => void;
  onBackToHome: () => void;
}

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  slug,
  onNavigateToBooking,
  onNavigateToQueue,
  onBackToHome,
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showQR, setShowQR] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        let org = await StorageService.fetchOrganizationBySlug(slug);
        if (!org) {
          org = StorageService.getOrganizationBySlug(slug) || null;
        }
        if (!org) {
          const all = StorageService.getAllOrganizations();
          if (all.length > 0) {
            org = all[0];
          }
        }
        if (org) {
          setOrganization(org);
          setOrgNotFound(false);
          setServices(StorageService.getServices(org.id).filter(s => s.isActive));
          setProfessionals(StorageService.getProfessionals(org.id).filter(p => p.isActive));
          setReviews(StorageService.getReviews(org.id));
        } else {
          setOrgNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrg();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-xs text-slate-400">Carregando vitrine...</p>
      </div>
    );
  }

  if (orgNotFound || !organization) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <h2 className="text-xl font-black text-white">Barbearia Não Encontrada</h2>
          <p className="text-xs text-slate-400">
            A vitrine pública <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-400 font-mono">/b/{slug}</code> não existe.
          </p>
          <button
            onClick={onBackToHome}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 transition cursor-pointer"
          >
            Voltar para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const storeUrl = `${origin}/b/${slug}`;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950 pb-20">
      {/* Cover / Header Banner */}
      <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-slate-800 flex items-end">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-xs text-slate-300 border border-slate-700 hover:text-white"
          >
            <QrCode className="h-3.5 w-3.5 text-amber-400" />
            <span>QR Code</span>
          </button>
        </div>

        <div className="mx-auto max-w-4xl w-full px-6 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 translate-y-12 sm:translate-y-8">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-slate-900 border-4 border-slate-950 text-amber-400 shadow-2xl">
            <Scissors className="h-10 w-10" />
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{organization.name}</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {organization.type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">{organization.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="mx-auto max-w-4xl px-6 pt-16 sm:pt-14 space-y-8">
        {/* Rating and Contact Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <span className="font-bold text-white font-mono text-sm">{avgRating}</span>
            <span className="text-xs text-slate-400">({reviews.length} avaliações)</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {organization.whatsapp && (
              <a
                href={WhatsAppService.getWhatsAppDirectLink(organization.whatsapp, 'Olá! Gostaria de informações.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 hover:bg-emerald-500/20 transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {organization.instagram && (
              <a
                href={`https://instagram.com/${organization.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 px-3 py-1.5 hover:bg-purple-500/20 transition"
              >
                <Instagram className="h-3.5 w-3.5" />
                <span>Instagram</span>
              </a>
            )}
          </div>
        </div>

        {/* 2 Big Action CTA Cards (#40) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onNavigateToBooking(organization.slug)}
            className="cursor-pointer group rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 p-6 hover:border-amber-400 transition shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md">
                <Calendar className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-black text-white">Agendar Horário Online</h3>
            <p className="mt-1 text-xs text-slate-400">
              Escolha seu profissional favorito, data e horário com confirmação imediata.
            </p>
          </div>

          <div
            onClick={() => onNavigateToQueue(organization.slug)}
            className="cursor-pointer group rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 p-6 hover:border-amber-400 transition shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md">
                <Clock className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="text-lg font-black text-white">Fila Virtual (Sem Espera Física)</h3>
            <p className="mt-1 text-xs text-slate-400">
              Entre na fila com Nome e WhatsApp. Seu lugar fica garantido e o app avisa no WhatsApp quando chegar a sua vez de cortar ou fazer a barba!
            </p>
          </div>
        </div>

        {/* Catálogo de Serviços */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Nossos Serviços & Valores
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{srv.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{srv.description}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Duração: {srv.durationMinutes} min
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-emerald-400 font-mono">
                    R$ {srv.price.toFixed(2)}
                  </div>
                  <button
                    onClick={() => onNavigateToBooking(organization.slug)}
                    className="mt-1 text-[10px] text-amber-400 hover:underline font-semibold"
                  >
                    Agendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nossa Equipe */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scissors className="h-5 w-5 text-amber-400" />
            Barbeiros & Especialistas
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {professionals.map((prof) => (
              <div
                key={prof.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center"
              >
                <img
                  src={prof.avatarUrl}
                  alt={prof.name}
                  className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-slate-800 mb-2"
                />
                <h4 className="text-xs font-bold text-white">{prof.name}</h4>
                <p className="text-[10px] text-amber-400 mt-0.5">{prof.specialties[0] || 'Barbeiro'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Endereço & Horários */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            Localização & Horário de Funcionamento
          </h3>

          <p className="text-xs text-slate-300">
            {organization.address.street}, {organization.address.number} — {organization.address.neighborhood}, {organization.address.city}/{organization.address.state}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-400">
            {organization.workingHours.map((wh) => (
              <div key={wh.dayOfWeek} className="p-2 rounded-xl bg-slate-950 border border-slate-850">
                <span className="font-bold text-slate-200 block">{wh.dayName.split('-')[0]}</span>
                {wh.isOpen ? (
                  <span>{wh.openTime} às {wh.closeTime}</span>
                ) : (
                  <span className="text-rose-400">Fechado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title={organization.name}
        subtitle="Escaneie para abrir a página do estabelecimento"
        url={storeUrl}
        establishmentName={organization.name}
      />
    </div>
  );
};
