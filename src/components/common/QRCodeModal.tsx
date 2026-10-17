import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, Copy, Check, ExternalLink, QrCode, ArrowRight, Send, Globe } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
  establishmentName: string;
  onNavigateDirectly?: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  url,
  establishmentName,
  onNavigateDirectly,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Guarantee absolute URL
  const absoluteUrl = (() => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (typeof window !== 'undefined') {
      const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  })();

  useEffect(() => {
    if (isOpen && absoluteUrl) {
      // 1. Generate reliable Base64 image
      QRCode.toDataURL(
        absoluteUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, dataUri) => {
          if (!err && dataUri) {
            setQrDataUrl(dataUri);
          }
        }
      );

      // 2. Also draw to canvas if ref mounted
      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          absoluteUrl,
          {
            width: 260,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          },
          (err) => {
            if (err) console.warn('Canvas QR render error:', err);
          }
        );
      }
    }
  }, [isOpen, absoluteUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard && absoluteUrl) {
      navigator.clipboard.writeText(absoluteUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <html>
        <head>
          <title>${establishmentName} - ${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #0f172a; border-radius: 16px; padding: 32px; max-width: 400px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; color: #0f172a; }
            p { font-size: 14px; color: #475569; margin-bottom: 24px; }
            img { width: 260px; height: 260px; margin-bottom: 16px; }
            .url { font-family: monospace; font-size: 12px; color: #64748b; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${establishmentName}</h1>
            <p>${title}<br/><small>${subtitle || 'Aponte a câmera do seu celular'}</small></p>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="url">${absoluteUrl}</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleOpenLink = () => {
    onClose();
    if (onNavigateDirectly) {
      onNavigateDirectly();
      return;
    }
    // Check if it is a local relative or same-domain link
    try {
      if (typeof window !== 'undefined') {
        const u = new URL(absoluteUrl, window.location.href);
        if (u.origin === window.location.origin) {
          window.location.href = u.pathname + u.search + u.hash;
          return;
        }
      }
    } catch {
      // fallback
    }
    window.open(absoluteUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <QrCode className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle || 'Escaneie para acessar instantaneamente'}</p>
        </div>

        {/* QR Display */}
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl bg-white p-6 shadow-inner">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-[260px] h-[260px] rounded-lg" />
          ) : (
            <canvas ref={canvasRef} className="rounded-lg" />
          )}
          <p className="mt-2 text-xs font-bold text-slate-800 text-center">
            {establishmentName}
          </p>
        </div>

        {/* URL Box with direct click */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-950 p-2.5 border border-slate-800">
          <a
            href={absoluteUrl}
            onClick={(e) => {
              e.preventDefault();
              handleOpenLink();
            }}
            title="Clique para abrir a fila agora"
            className="truncate text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline flex-1 cursor-pointer"
          >
            {absoluteUrl}
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        {/* Direct Access / Test Button (ALWAYS Available) */}
        <button
          onClick={handleOpenLink}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Acessar Fila / Página Agora</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* WhatsApp Sharing Button */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
            `Entre na fila virtual ou agende seu horário em ${establishmentName}: ${absoluteUrl}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer"
        >
          <Send className="h-4 w-4" />
          <span>Enviar Link no WhatsApp</span>
        </a>

        {/* Worldwide Notice */}
        <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left text-[11px] text-blue-200 flex items-start gap-2">
          <Globe className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Link Online Mundial:</strong> Seus clientes podem acessar de qualquer celular ou computador de casa, entrar na fila virtual e aguardar sua chamada sem precisar ir até a barbearia antes da hora.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-amber-400" />
            Baixar Imagem
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-2.5 text-xs font-medium text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-300" />
            Imprimir Cartaz
          </button>
        </div>
      </div>
    </div>
  );
};
