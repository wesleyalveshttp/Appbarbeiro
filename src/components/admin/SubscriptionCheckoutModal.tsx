import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  X,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Send
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization } from '../../types';

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onSuccess: () => void;
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  isOpen,
  onClose,
  organization,
  onSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [paymentTab, setPaymentTab] = useState<'PIX' | 'CHECKOUT_PRO'>('PIX');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mercado Pago config status
  const [mpConfigStatus, setMpConfigStatus] = useState<{
    isConfigured: boolean;
    hasWebhookSecret: boolean;
    appUrl: string;
    configuredMessage: string;
  } | null>(null);

  // Active created payment state (Real Mercado Pago)
  const [pixPaymentData, setPixPaymentData] = useState<{
    paymentId: number | string;
    status: string;
    statusDetail?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    amount: number;
    planTitle: string;
  } | null>(null);

  const [checkoutProData, setCheckoutProData] = useState<{
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint?: string;
    amount: number;
    planTitle: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const planAmount = selectedPlan === 'ANNUAL' ? 838.80 : 79.90;
  const planLabel = selectedPlan === 'ANNUAL' ? 'Plano Pro Anual (R$ 838,80 à vista)' : 'Plano Pro Mensal (R$ 79,90/mês)';

  // Check Mercado Pago configuration on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/mercadopago/config-status')
        .then((r) => r.json())
        .then((data) => {
          setMpConfigStatus(data);
        })
        .catch(() => {
          setMpConfigStatus({
            isConfigured: false,
            hasWebhookSecret: false,
            appUrl: window.location.origin,
            configuredMessage: 'Erro ao verificar configuração do Mercado Pago.',
          });
        });
    }
  }, [isOpen]);

  // Render QR Code onto canvas if PIX qrCode string is available
  useEffect(() => {
    if (pixPaymentData?.qrCode && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pixPaymentData.qrCode, {
        width: 230,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }
  }, [pixPaymentData?.qrCode]);

  // Polling for payment status if a real payment is active
  useEffect(() => {
    if (!isOpen || !pixPaymentData?.paymentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/payment-status/${pixPaymentData.paymentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'approved') {
            await StorageService.syncWithServer();
            onSuccess();
            onClose();
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, pixPaymentData?.paymentId]);

  if (!isOpen) return null;

  // 1. Create Real PIX Payment via Backend
  const handleGenerateRealPix = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/mercadopago/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          planType: selectedPlan,
          paymentMethodType: 'PIX',
          payerEmail: organization.ownerEmail,
          payerName: organization.ownerName || organization.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details
          ? `${data.message} (${data.details})`
          : data.message || 'Erro ao comunicar com a API do Mercado Pago.';
        setErrorMessage(errorText);
        setIsProcessing(false);
        return;
      }

      if (data.success && data.type === 'PIX') {
        setPixPaymentData(data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha na requisição de pagamento ao servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Create Real Checkout Pro (Cartão de Crédito / Parcelado / Checkout Oficial)
  const handleGenerateCheckoutPro = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/mercadopago/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          planType: selectedPlan,
          paymentMethodType: 'CHECKOUT_PRO',
          payerEmail: organization.ownerEmail,
          payerName: organization.ownerName || organization.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details
          ? `${data.message} (${data.details})`
          : data.message || 'Erro ao gerar checkout do Mercado Pago.';
        setErrorMessage(errorText);
        setIsProcessing(false);
        return;
      }

      if (data.success && data.type === 'CHECKOUT_PRO') {
        setCheckoutProData(data);
        // Open Mercado Pago official checkout in new tab or redirect
        if (data.initPoint) {
          window.open(data.initPoint, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao conectar com o servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. User clicks "Já realizei o pagamento — Verificar Status"
  const handleCheckCurrentStatus = async () => {
    if (!pixPaymentData?.paymentId) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/mercadopago/payment-status/${pixPaymentData.paymentId}`);
      const data = await res.json();

      if (data.status === 'approved') {
        await StorageService.syncWithServer();
        onSuccess();
        onClose();
      } else {
        setErrorMessage(
          `Status atual no Mercado Pago: ${data.status || 'pendente'} (${data.statusDetail || 'aguardando compensação'}). Se você já pagou, aguarde alguns instantes pela confirmação do banco.`
        );
      }
    } catch (err: any) {
      setErrorMessage('Não foi possível consultar o status da cobrança no momento.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCopyPix = () => {
    if (pixPaymentData?.qrCode) {
      navigator.clipboard.writeText(pixPaymentData.qrCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Assinatura BarberOS Pro</h2>
            <p className="text-xs text-slate-400">Checkout Oficial integrado via Mercado Pago</p>
          </div>
        </div>

        {/* Credentials Warning if not configured in Google AI Studio */}
        {mpConfigStatus && !mpConfigStatus.isConfigured && (
          <div className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Configuração Pendente: Mercado Pago</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Para processar cobranças reais, configure a credencial <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-mono">MERCADOPAGO_ACCESS_TOKEN</code> na aba <strong>Settings → Secrets</strong> do Google AI Studio.
            </p>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && (
          <div className="mt-3 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Plan Selector Toggle (R$ 838,80 à vista vs 79,90/mês) */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedPlan('ANNUAL');
              setPixPaymentData(null);
              setCheckoutProData(null);
              setErrorMessage(null);
            }}
            className={`p-3 rounded-xl text-left transition relative cursor-pointer ${
              selectedPlan === 'ANNUAL'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 border-2 border-amber-500 text-white'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                R$ 838,80 à vista
              </span>
              <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                -R$ 120/ano
              </span>
            </div>
            <div className="text-sm font-black text-white">Plano Anual Pro</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Valor integral R$ 838,80 (até 12x no cartão)</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedPlan('MONTHLY');
              setPixPaymentData(null);
              setCheckoutProData(null);
              setErrorMessage(null);
            }}
            className={`p-3 rounded-xl text-left transition cursor-pointer ${
              selectedPlan === 'MONTHLY'
                ? 'bg-slate-800 border-2 border-slate-600 text-white'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
              Mês a Mês
            </div>
            <div className="text-sm font-black text-white">Plano Mensal Pro</div>
            <div className="text-[10px] text-slate-400 mt-0.5">R$ 79,90 / mês sem fidelidade</div>
          </button>
        </div>

        {/* Price & Summary Box */}
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 p-4 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                {selectedPlan === 'ANNUAL' ? 'Valor Total do Plano Anual' : 'Valor da Mensalidade'}
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {selectedPlan === 'ANNUAL' ? (
                  <>R$ 838,80 <span className="text-xs text-slate-400 font-normal">à vista</span></>
                ) : (
                  <>R$ 79,90 <span className="text-xs text-slate-400 font-normal">/ mês</span></>
                )}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold block">✓ Mercado Pago Seguro</span>
              <span>{selectedPlan === 'ANNUAL' ? 'Economia de R$ 120/ano' : 'Ativação Automática'}</span>
            </div>
          </div>

          {selectedPlan === 'ANNUAL' && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                <CreditCard className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Parcelamento em até 12x no cartão de crédito disponível</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                ⚡ Os juros da operadora de cartão de crédito ficam a cargo do comprador (cliente). O valor integral de R$ 838,80 é preservado sem descontos de parcelamento.
              </p>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Fila digital em tempo real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Notificações som & vibração</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Painel das Cadeiras</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Agendamento online 24/7</span>
            </div>
          </div>
        </div>

        {/* Payment Tabs: PIX vs Checkout Pro (Cartão de Crédito) */}
        <div className="mt-5 grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPaymentTab('PIX')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              paymentTab === 'PIX'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>PIX Mercado Pago</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentTab('CHECKOUT_PRO')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              paymentTab === 'CHECKOUT_PRO'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Cartão / Checkout Pro</span>
          </button>
        </div>

        {/* TAB 1: PIX REAL MERCADO PAGO */}
        {paymentTab === 'PIX' && (
          <div className="mt-5 space-y-4">
            {!pixPaymentData ? (
              <div className="text-center py-4 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gerar Cobrança PIX Oficial</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    O servidor irá gerar um QR Code e código Copia e Cola oficiais do Mercado Pago no valor de R$ {planAmount.toFixed(2).replace('.', ',')}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleGenerateRealPix}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Gerando PIX no Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4" />
                      <span>Gerar PIX Oficial — R$ {planAmount.toFixed(2).replace('.', ',')}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-inner max-w-xs mx-auto">
                  {pixPaymentData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixPaymentData.qrCodeBase64}`}
                      alt="QR Code PIX Mercado Pago"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <canvas ref={canvasRef} className="rounded-lg" />
                  )}
                  <div className="text-[11px] font-bold text-slate-900 mt-2">
                    ID da Cobrança: #{pixPaymentData.paymentId}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Valor: R$ {pixPaymentData.amount.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                {pixPaymentData.qrCode && (
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Código PIX Copia e Cola:</span>
                      <span className="text-[10px] text-emerald-400">Verificação Automática Ativa</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                      <span className="truncate text-xs font-mono text-slate-400 flex-1">
                        {pixPaymentData.qrCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                      >
                        {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isCheckingStatus}
                    onClick={handleCheckCurrentStatus}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isCheckingStatus ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Consultando Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Já Paguei — Confirmar Liberação Agora</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPixPaymentData(null)}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Gerar nova cobrança ou alterar plano
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHECKOUT PRO (CARTÃO DE CRÉDITO / PARCELAMENTO) */}
        {paymentTab === 'CHECKOUT_PRO' && (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <CreditCard className="h-4 w-4 text-amber-400" />
                <span>Checkout Pro Oficial do Mercado Pago</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pague com Cartão de Crédito em até 12x com proteção do comprador, ou utilize saldo do Mercado Pago.
              </p>
              <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                ✓ Seus dados de cartão são processados exclusivamente pelo ambiente seguro do Mercado Pago.
              </div>
            </div>

            {checkoutProData?.initPoint ? (
              <div className="space-y-3 text-center">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-left space-y-1">
                  <div className="font-bold text-amber-300">Checkout Gerado com Sucesso!</div>
                  <p className="text-[11px] text-slate-300">
                    A página de pagamento do Mercado Pago foi aberta. Se a janela não abriu automaticamente, clique no botão abaixo.
                  </p>
                </div>

                <a
                  href={checkoutProData.initPoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir Tela Segura do Mercado Pago</span>
                </a>

                <button
                  type="button"
                  disabled={isCheckingStatus}
                  onClick={async () => {
                    setIsCheckingStatus(true);
                    await StorageService.syncWithServer();
                    const updated = StorageService.getOrganizationById(organization.id);
                    if (updated?.subscription?.status === 'ATIVA') {
                      onSuccess();
                      onClose();
                    } else {
                      setErrorMessage('Pagamento ainda não confirmado pelo Mercado Pago. Assim que concluir no checkout, a ativação ocorrerá automaticamente.');
                    }
                    setIsCheckingStatus(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>Verificar Atualização da Assinatura</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleGenerateCheckoutPro}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-4 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Iniciando Checkout Seguro...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    <span>Prosseguir para Checkout do Mercado Pago</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>
            Integração Oficial Mercado Pago · SSL Criptografado · {selectedPlan === 'ANNUAL' ? 'Plano Anual R$ 838,80 (parcelável até 12x)' : 'R$ 79,90/mês'}
          </span>
        </div>
      </div>
    </div>
  );
};
