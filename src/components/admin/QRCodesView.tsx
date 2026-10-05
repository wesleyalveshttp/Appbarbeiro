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
}

export const QRCodesView: React.FC<QRCodesViewProps> = ({ organization }) => {
  const [activeModal, setActiveModal] = useState<{
    title: string;
    subtitle: string;
    url: string;
  } | null>(null);

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

                <div className="mt-4 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 truncate">
                  {card.url}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() =>
                    setActiveModal({
                      title: card.title,
                      subtitle: card.subtitle,
                      url: card.url,
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-md transition"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Visualizar & Baixar QR Code</span>
                </button>

                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Testar link no navegador</span>
                </a>
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
        />
      )}
    </div>
  );
};
