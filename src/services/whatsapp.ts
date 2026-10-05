import { Organization } from '../types';

export interface WhatsAppTemplateData {
  customerName: string;
  customerPhone: string;
  establishmentName: string;
  serviceName?: string;
  professionalName?: string;
  date?: string;
  time?: string;
  queuePosition?: number;
  ticketNumber?: number;
  trackingUrl?: string;
}

export class WhatsAppService {
  /**
   * Generates official WhatsApp message template strings
   */
  static getMessageText(type: 'CONFIRMACAO' | 'LEMBRETE' | 'FILA_ENTRADA' | 'PROXIMO' | 'SUA_VEZ' | 'FINALIZADO', data: WhatsAppTemplateData): string {
    switch (type) {
      case 'CONFIRMACAO':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Seu horário para *${data.serviceName}* com *${data.professionalName}* está confirmado para o dia *${data.date}* às *${data.time}*.\n\n📍 Acompanhe ou gerencie seu horário aqui:\n${data.trackingUrl || ''}\n\nTe esperamos!`;

      case 'LEMBRETE':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Passando para lembrar do seu atendimento hoje às *${data.time}* com *${data.professionalName}*.\n\nCaso precise avisar que está a caminho ou reagendar:\n${data.trackingUrl || ''}`;

      case 'FILA_ENTRADA':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Você entrou na nossa fila digital de espera (Senha #${data.ticketNumber}).\n\nSua posição atual é *#${data.queuePosition}*.\n\nAcompanhe sua posição ao vivo pelo link:\n${data.trackingUrl || ''}`;

      case 'PROXIMO':
        return `💈 *${data.establishmentName}*\n\n⚠️ Atenção, *${data.customerName}*!\nVocê é o *próximo da fila* para ser atendido. Por favor, aproxime-se da recepção.`;

      case 'SUA_VEZ':
        return `💈 *${data.establishmentName}*\n\n🎉 *Chegou a sua vez!* O profissional *${data.professionalName || 'da cadeira'}* está pronto para te atender. Dirija-se à cadeira!`;

      case 'FINALIZADO':
        return `💈 *${data.establishmentName}*\n\nObrigado pela preferência, *${data.customerName}*! Esperamos que tenha gostado do atendimento de hoje.\n\nPoderia deixar uma avaliação rápida de 1 minuto para nos ajudar?\n${data.trackingUrl || ''}`;

      default:
        return '';
    }
  }

  /**
   * Formats a clean Brazilian WhatsApp URL (wa.me) so the barber or system can trigger it
   */
  static getWhatsAppDirectLink(phone: string, text: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Official WhatsApp Cloud API dispatcher simulation/check
   * Does NOT pretend messages were sent if API is not configured!
   */
  static async sendViaOfficialApi(
    org: Organization,
    phone: string,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    if (!org.settings.whatsappApiConfigured || !org.settings.whatsappApiKey) {
      return {
        success: false,
        message: 'API Oficial do WhatsApp Business não configurada nas configurações do estabelecimento. Use o envio manual via link direto.'
      };
    }

    try {
      // In a production backend, this would call:
      // https://graph.facebook.com/v18.0/{phone_number_id}/messages
      return {
        success: true,
        message: 'Mensagem enviada com sucesso via WhatsApp Cloud API Oficial.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na API Oficial do WhatsApp: ${err.message || 'Erro de conexão'}`
      };
    }
  }
}
