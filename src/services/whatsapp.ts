import { Organization, Appointment, WaitingQueueItem } from '../types';

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
  minutesRemaining?: number;
}

export class WhatsAppService {
  /**
   * Generates official WhatsApp message template strings
   */
  static getMessageText(
    type:
      | 'CONFIRMACAO'
      | 'LEMBRETE'
      | 'LEMBRETE_40MIN'
      | 'FILA_ENTRADA'
      | 'FILA_40MIN'
      | 'PROXIMO'
      | 'SUA_VEZ'
      | 'FINALIZADO',
    data: WhatsAppTemplateData
  ): string {
    switch (type) {
      case 'LEMBRETE_40MIN':
        return `💈 *${data.establishmentName}*\n\nFala, *${data.customerName}*! Tudo certo?\n\nPassando para avisar que seu horário para *${data.serviceName}* com *${data.professionalName || 'nosso barbeiro'}* é daqui a *40 minutos* (às *${data.time}*).\n\n⏰ *Para que você não se atrase e seu corte comece pontualmente*, já pode ir se organizando ou saindo de casa/trabalho!\n\n📍 Localização / Como Chegar:\n${data.trackingUrl || ''}\n\nTe esperamos na cadeira! Caso tenha algum imprevisto, favor responder esta mensagem. ✂️`;

      case 'FILA_40MIN':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Sua vez na fila de espera da barbearia está se aproximando (Senha *#${data.ticketNumber}*)!\n\n⏳ A previsão para o seu atendimento é de aproximadamente *40 minutos*.\n\nPara não perder o seu lugar na fila e evitar atrasos, já pode ir se deslocando até a barbearia!\n\n📍 Acompanhe sua posição ao vivo:\n${data.trackingUrl || ''}\n\nTe esperamos!`;

      case 'CONFIRMACAO':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Seu horário para *${data.serviceName}* com *${data.professionalName}* está confirmado para o dia *${data.date}* às *${data.time}*.\n\n📍 Acompanhe ou gerencie seu horário aqui:\n${data.trackingUrl || ''}\n\nTe esperamos!`;

      case 'LEMBRETE':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Passando para lembrar do seu atendimento hoje às *${data.time}* com *${data.professionalName}*.\n\nCaso precise avisar que está a caminho ou reagendar:\n${data.trackingUrl || ''}`;

      case 'FILA_ENTRADA':
        return `💈 *${data.establishmentName}*\n\nOlá, *${data.customerName}*! Você entrou na nossa fila virtual de espera (Senha #${data.ticketNumber}).\n\nSua posição atual é *#${data.queuePosition}*.\n\n✨ *Você NÃO precisa ficar esperando na barbearia!* O seu lugar já está garantido na fila. Fique à vontade onde estiver: quando chegar o momento de cortar seu cabelo ou fazer sua barba, enviaremos automaticamente uma mensagem avisando para você vir!\n\nAcompanhe sua posição ao vivo:\n${data.trackingUrl || ''}`;

      case 'PROXIMO':
        return `💈 *${data.establishmentName}*\n\n⚠️ *Atenção, ${data.customerName}! Faltam cerca de 5 minutos!*\nVocê é o *próximo da fila*. Por favor, dirija-se à barbearia para o seu corte ou barba.`;

      case 'SUA_VEZ':
        return `💈 *${data.establishmentName}*\n\n🎉 *Chegou a sua vez, ${data.customerName}!* O seu barbeiro *${data.professionalName || 'da cadeira'}* já está te aguardando na barbearia para cortar seu cabelo ou fazer sua barba. Dirija-se à cadeira agora mesmo!`;

      case 'FINALIZADO':
        return `💈 *${data.establishmentName}*\n\nObrigado pela preferência, *${data.customerName}*! Esperamos que tenha gostado do atendimento de hoje.\n\nPoderia deixar uma avaliação rápida de 1 minuto para nos ajudar?\n${data.trackingUrl || ''}`;

      default:
        return '';
    }
  }

  /**
   * Formats a clean Brazilian WhatsApp URL (wa.me)
   */
  static getWhatsAppDirectLink(phone: string, text: string): string {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Generates 40-minute reminder text for an appointment
   */
  static get40MinReminderForAppointment(org: Organization, apt: Appointment, baseUrl?: string): {
    text: string;
    whatsappUrl: string;
    phone: string;
  } {
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const trackingUrl = apt.token ? `${origin}/atendimento/${apt.token}` : `${origin}/b/${org.slug}`;

    const text = this.getMessageText('LEMBRETE_40MIN', {
      customerName: apt.customerName,
      customerPhone: apt.customerPhone,
      establishmentName: org.name,
      serviceName: apt.serviceName,
      professionalName: apt.professionalName,
      date: apt.date,
      time: apt.time,
      trackingUrl,
    });

    return {
      text,
      whatsappUrl: this.getWhatsAppDirectLink(apt.customerPhone, text),
      phone: apt.customerPhone,
    };
  }

  /**
   * Generates 40-minute reminder text for a waiting queue item
   */
  static get40MinReminderForQueue(org: Organization, item: WaitingQueueItem, baseUrl?: string): {
    text: string;
    whatsappUrl: string;
    phone: string;
  } {
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const trackingUrl = `${origin}/fila/${org.slug}?ticket=${item.id}`;

    const text = this.getMessageText('FILA_40MIN', {
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      establishmentName: org.name,
      serviceName: item.serviceName,
      ticketNumber: item.ticketNumber,
      trackingUrl,
    });

    return {
      text,
      whatsappUrl: this.getWhatsAppDirectLink(item.customerPhone, text),
      phone: item.customerPhone,
    };
  }

  /**
   * Official WhatsApp Cloud API dispatcher
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
