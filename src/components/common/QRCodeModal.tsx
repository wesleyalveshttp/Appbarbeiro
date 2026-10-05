import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
  establishmentName: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  url,
  establishmentName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 260,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (!err && canvasRef.current) {
            setQrDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
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
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>${establishmentName} - ${title}</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; text-align: center; padding: 40px; }
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
            <div class="url">${url}</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
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

        {/* QR Canvas Display */}
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl bg-white p-6 shadow-inner">
          <canvas ref={canvasRef} className="rounded-lg" />
          <p className="mt-2 text-xs font-medium text-slate-500 text-center">
            {establishmentName}
          </p>
        </div>

        {/* URL Box */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800">
          <span className="truncate text-xs font-mono text-slate-300 flex-1">{url}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 shadow-md transition"
          >
            <Download className="h-4 w-4" />
            Baixar Imagem
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
          >
            <Printer className="h-4 w-4" />
            Imprimir Cartaz
          </button>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir link em nova aba
        </a>
      </div>
    </div>
  );
};
