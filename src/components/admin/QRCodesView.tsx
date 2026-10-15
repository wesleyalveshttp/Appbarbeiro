import React, { useState } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Calendar,
  Clock,
  Building2
} from 'lucide-react';
import { Organization } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';

interface QRCodesViewProps {
  organization: Organization;
  onNavigateToQueue?: (slug: string) => void;
  onNavigateToBooking?: (slug: string) => void;
  onNavigateToStore?: (slug: string) => void;
}

export const QRCodesView: React.FC<QRCodesViewProps> = ({
  organization,
  onNavigateToQueue,
  onNavigateToBooking,
  onNavigateToStore,
}) => {
  const [activeModal, setActiveModal] = useState<{
    id: string;
    title: string;
    subtitle: string;
    url: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingUrl = `${origin}/agendar/${organization.slug}`;
  const queueUrl = `${origin}/fila/${organization.slug}`;
  const storeUrl = `${origin}/b/${organization.slug}`;

  const qrCards = [
    {
      id: 'booking',
      title: 'QR Code de Agendamento Online',
      subtitle: 'Clientes escaneiam para escolher serviço, data e horário',
      url: bookingUrl,
      icon: Calendar,
      color: 'text-amber-400',
      badge: '/agendar/' + organization.slug,
    },
    {
      id: 'queue',
      title: 'QR Code da Fila de Espera Digital',
      subtitle: 'Ideal para imprimir e colocar no balcão de recepção ou espelhos',
      url: queueUrl,
      icon: Clock,
      color: 'text-blue-400',
      badge: '/fila/' + organization.slug,
    },
    {
      id: 'store',
      title: 'QR Code da Vitrine / Cartão Digital',
      subtitle: 'Apresenta catálogo de serviços, fotos, endereço e links rápidos',
      url: storeUrl,
      icon: Building2,
      color: 'text-purple-400',
      badge: '/b/' + organization.slug,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Central de QR Codes & Links Públicos</h1>
            <p className="mt-1 text-xs text-slate-400">
              Gere, baixe imagens PNG em alta resolução e imprima cartazes profissionais para seu salão.
            </p>
          </div>
        </div>
      </div>

      {/* QR Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {qrCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-5 shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700">
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[140px]">
                    {card.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{card.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.subtitle}</p>

                <div className="mt-4 flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-300 truncate flex-1">
                    {card.url}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(card.url);
                      setCopiedId(card.id);
                      setTimeout(() => setCopiedId(null), 2500);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer shrink-0"
                  >
                    {copiedId === card.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-bold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-slate-400" />
                        <span className="text-[11px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {/* Direct Test / Open in System Button */}
                <button
                  onClick={() => {
                    if (card.id === 'queue' && onNavigateToQueue) {
                      onNavigateToQueue(organization.slug);
                    } else if (card.id === 'booking' && onNavigateToBooking) {
                      onNavigateToBooking(organization.slug);
                    } else if (card.id === 'store' && onNavigateToStore) {
                      onNavigateToStore(organization.slug);
                    } else {
                      window.open(card.url, '_blank');
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer shadow-md ${
                    card.id === 'queue'
                      ? 'bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-blue-500/20'
                      : card.id === 'booking'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>
                    {card.id === 'queue'
                      ? 'Abrir Fila Virtual Agora'
                      : card.id === 'booking'
                      ? 'Testar Agendamento Online'
                      : 'Acessar Vitrine Digital'}
                  </span>
                </button>

                <button
                  onClick={() =>
                    setActiveModal({
                      id: card.id,
                      title: card.title,
                      subtitle: card.subtitle,
                      url: card.url,
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <QrCode className="h-4 w-4 text-amber-400" />
                  <span>Visualizar & Baixar QR Code</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeModal && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeModal.title}
          subtitle={activeModal.subtitle}
          url={activeModal.url}
          establishmentName={organization.name}
          onNavigateDirectly={() => {
            if (activeModal.id === 'queue' && onNavigateToQueue) {
              onNavigateToQueue(organization.slug);
            } else if (activeModal.id === 'booking' && onNavigateToBooking) {
              onNavigateToBooking(organization.slug);
            } else if (activeModal.id === 'store' && onNavigateToStore) {
              onNavigateToStore(organization.slug);
            } else {
              window.open(activeModal.url, '_blank');
            }
          }}
        />
      )}
    </div>
  );
};
