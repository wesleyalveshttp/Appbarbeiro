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
  MessageCircle,
  Clock,
  ArrowRight,
  ExternalLink
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
  const [paymentTab, setPaymentTab] = useState<'PIX' | 'CARTAO'>('PIX');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofSent, setProofSent] = useState(organization.subscription?.status === 'AGUARDANDO_APROVACAO');

  const planAmount = selectedPlan === 'ANNUAL' ? 838.8 : 79.9;
  const planLabel = selectedPlan === 'ANNUAL' ? 'Plano Pro Anual (12x R$ 69,90)' : 'Plano Pro Mensal (R$ 79,90/mês)';

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Realistic PIX Copia e Cola String
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136barberos-pagamentos@saas.com.br5204000053039865405${planAmount.toFixed(2)}5802BR5920BARBEROS TECNOLOGIA6009SAO PAULO62140510AS_${organization.slug.toUpperCase()}_${selectedPlan === 'ANNUAL' ? 'ANUAL' : 'MENSAL'}6304E7A2`;

  const ownerWhatsAppNumber = '5511999998888';
  const ownerWhatsAppUrl = `https://wa.me/${ownerWhatsAppNumber}?text=${encodeURIComponent(
    `Olá! Sou o dono da ${organization.name}. Acabei de realizar o pagamento via PIX no valor de R$ ${planAmount.toFixed(2).replace('.', ',')} do ${planLabel}. Segue o comprovante para confirmação e liberação do acesso 100%!`
  )}`;

  useEffect(() => {
    if (isOpen && paymentTab === 'PIX' && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }
  }, [isOpen, paymentTab, pixCode]);

  if (!isOpen) return null;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleSendProofToOwner = () => {
    setIsProcessing(true);
    setTimeout(() => {
      StorageService.requestSubscriptionApproval(
        organization.id,
        `Comprovante de pagamento PIX de R$ ${planAmount.toFixed(2).replace('.', ',')} (${planLabel}) enviado pelo dono da barbearia`
      );
      setIsProcessing(false);
      setProofSent(true);
      onSuccess();
    }, 500);
  };

  const handleConfirmPixPaymentInstant = () => {
    setIsProcessing(true);
    setTimeout(() => {
      StorageService.activateSubscription(
        organization.id,
        'PIX',
        `${planLabel} - Aprovado Instantaneamente (Modo Teste)`
      );
      setIsProcessing(false);
      onSuccess();
      onClose();
    }, 600);
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) return;

    setIsProcessing(true);
    setTimeout(() => {
      StorageService.activateSubscription(
        organization.id,
        'CARTAO_CREDITO',
        `${planLabel} - Cartão final ${cardNumber.slice(-4) || '4242'}`
      );
      setIsProcessing(false);
      onSuccess();
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Plano BarberOS Pro</h2>
            <p className="text-xs text-slate-400">Desbloqueie 100% dos recursos do seu estabelecimento</p>
          </div>
        </div>

        {/* Plan Selector Toggle (12x 69,90 vs 79,90/mês) */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedPlan('ANNUAL')}
            className={`p-3 rounded-xl text-left transition relative cursor-pointer ${
              selectedPlan === 'ANNUAL'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 border-2 border-amber-500 text-white'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                12x R$ 69,90
              </span>
              <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                -R$ 120
              </span>
            </div>
            <div className="text-sm font-black text-white">Plano Anual Pro</div>
            <div className="text-[10px] text-slate-400 mt-0.5">R$ 838,80/ano parcelado</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('MONTHLY')}
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
                {selectedPlan === 'ANNUAL' ? 'Total Promocional Anual' : 'Valor da Mensalidade'}
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {selectedPlan === 'ANNUAL' ? (
                  <>12x R$ 69,90 <span className="text-xs text-slate-400 font-normal">(= R$ 838,80)</span></>
                ) : (
                  <>R$ 79,90 <span className="text-xs text-slate-400 font-normal">/ mês</span></>
                )}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold block">✓ Acesso Imediato</span>
              <span>100% Liberado</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Fila digital em tempo real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Alertas com som & vibração</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Painel das Cadeiras</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Financeiro & Comissões</span>
            </div>
          </div>
        </div>

        {/* Payment Tabs: PIX vs Cartão */}
        <div className="mt-5 grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPaymentTab('PIX')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
              paymentTab === 'PIX'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>Pagar via PIX (Instantâneo)</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentTab('CARTAO')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
              paymentTab === 'CARTAO'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Cartão de Crédito</span>
          </button>
        </div>

        {/* TAB CONTENT: PIX */}
        {paymentTab === 'PIX' && (
          <div className="mt-5 space-y-4 text-center">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-inner max-w-xs mx-auto">
              <canvas ref={canvasRef} className="rounded-lg" />
              <span className="text-[11px] font-bold text-slate-800 mt-1">
                Valor: R$ {planAmount.toFixed(2).replace('.', ',')} · {selectedPlan === 'ANNUAL' ? '12x R$ 69,90 (Anual)' : 'Mensal'}
              </span>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Código PIX Copia e Cola:</span>
                <span className="text-[10px] text-amber-400">Ativação Automática</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                <span className="truncate text-xs font-mono text-slate-400 flex-1">{pixCode}</span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                >
                  {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Status box if proof was sent */}
            {proofSent ? (
              <div className="rounded-2xl bg-amber-500/15 border border-amber-500/30 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Comprovante Enviado para o Dono da SaaS!</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  O dono da plataforma recebeu sua notificação e está conferindo a transferência de R$ 79,90. O acesso 100% será liberado assim que confirmado.
                </p>
                <a
                  href={ownerWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-bold text-slate-950 transition shadow-md"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Falar com o Dono no WhatsApp</span>
                </a>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {/* Send via WhatsApp to SaaS owner */}
                <a
                  href={ownerWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSendProofToOwner()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Enviar Comprovante via WhatsApp para o Dono da SaaS</span>
                </a>

                {/* Mark as paid / send for approval */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSendProofToOwner}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isProcessing ? 'Enviando...' : 'Já Fiz o PIX — Solicitar Liberação ao Dono'}</span>
                </button>
              </div>
            )}

            {/* Test Simulation Button */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleConfirmPixPaymentInstant}
                className="text-[11px] text-slate-400 hover:text-amber-400 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                title="Aprovação imediata para testes sem aguardar"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Simular Aprovação Imediata (Modo Teste)</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB CONTENT: CARTÃO */}
        {paymentTab === 'CARTAO' && (
          <form onSubmit={handleCardSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Número do Cartão *</label>
              <input
                type="text"
                required
                maxLength={19}
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4532 •••• •••• 4242"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Nome Impresso no Cartão *</label>
              <input
                type="text"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="EX: JOAO S ALVES"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Validade (MM/AA) *</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="12/28"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">CVV (3 dígitos) *</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="123"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">CPF do Titular *</label>
              <input
                type="text"
                required
                value={cardCpf}
                onChange={(e) => setCardCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {isProcessing
                    ? 'Processando...'
                    : `Pagar R$ ${planAmount.toFixed(2).replace('.', ',')} e Desbloquear`}
                </span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>
            Pagamento Seguro SSL · {selectedPlan === 'ANNUAL' ? '12x R$ 69,90 (R$ 838,80/ano)' : 'R$ 79,90 / mês'}
          </span>
        </div>
      </div>
    </div>
  );
};
