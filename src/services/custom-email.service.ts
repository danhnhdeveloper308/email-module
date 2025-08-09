import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service'; 

@Injectable()
export class CustomEmailService extends EmailService {
  
  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoice(
    customerEmail: string,
    customerName: string,
    invoiceData: {
      invoiceNumber: string;
      amount: number;
      dueDate: Date;
      items: Array<{ name: string; quantity: number; price: number }>;
      pdfContent?: string; // Base64 encoded PDF
    }
  ): Promise<string> {
    const attachments = [];
    
    // Add PDF attachment if provided
    if (invoiceData.pdfContent) {
      attachments.push({
        filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
        content: invoiceData.pdfContent,
        contentType: 'application/pdf'
      });
    }

    return this.queueEmail(
      customerEmail,
      `Invoice ${invoiceData.invoiceNumber} - Due ${invoiceData.dueDate.toLocaleDateString()}`,
      'invoice', // Template name
      {
        customerName,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount.toFixed(2),
        dueDate: invoiceData.dueDate,
        items: invoiceData.items,
        totalAmount: invoiceData.amount.toFixed(2),
        paymentUrl: `${process.env.APP_URL}/pay/${invoiceData.invoiceNumber}`,
      },
      {
        tags: ['invoice', 'billing'],
        trackOpens: true,
        trackClicks: true,
        attachments,
        priority: 'high',
        campaignId: 'invoices-2024'
      }
    );
  }

  /**
   * Send order shipped notification
   */
  async sendOrderShipped(
    customerEmail: string,
    customerName: string,
    orderData: {
      orderNumber: string;
      trackingNumber: string;
      carrier: string;
      estimatedDelivery: Date;
      items: Array<{ name: string; quantity: number }>;
    }
  ): Promise<string> {
    return this.queueEmail(
      customerEmail,
      `Your order ${orderData.orderNumber} has shipped! 📦`,
      'order-shipped',
      {
        customerName,
        orderNumber: orderData.orderNumber,
        trackingNumber: orderData.trackingNumber,
        carrier: orderData.carrier,
        estimatedDelivery: orderData.estimatedDelivery,
        items: orderData.items,
        trackingUrl: this.generateTrackingUrl(orderData.carrier, orderData.trackingNumber),
      },
      {
        tags: ['order', 'shipping', 'transactional'],
        trackOpens: true,
        trackClicks: true,
        priority: 'normal'
      }
    );
  }

  /**
   * Send subscription renewal reminder
   */
  async sendSubscriptionRenewal(
    userEmail: string,
    userData: {
      name: string;
      plan: string;
      expiryDate: Date;
      renewalPrice: number;
      discountCode?: string;
    }
  ): Promise<string> {
    const daysUntilExpiry = Math.ceil(
      (userData.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return this.queueEmail(
      userEmail,
      `Your ${userData.plan} subscription expires in ${daysUntilExpiry} days`,
      'subscription-renewal',
      {
        name: userData.name,
        plan: userData.plan,
        expiryDate: userData.expiryDate,
        renewalPrice: userData.renewalPrice.toFixed(2),
        daysUntilExpiry,
        discountCode: userData.discountCode,
        renewalUrl: `${process.env.APP_URL}/billing/renew`,
        upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
      },
      {
        tags: ['subscription', 'renewal', 'billing'],
        campaignId: 'subscription-renewals-2024',
        trackOpens: true,
        trackClicks: true,
        priority: daysUntilExpiry <= 3 ? 'high' : 'normal',
        deliveryTime: daysUntilExpiry > 7 ? 
          new Date(Date.now() + 24 * 60 * 60 * 1000) : // Send tomorrow if > 7 days
          undefined // Send immediately if <= 7 days
      }
    );
  }

  /**
   * Send marketing campaign email
   */
  async sendMarketingCampaign(
    recipients: Array<{
      email: string;
      name: string;
      segment: string;
      preferences?: Record<string, any>;
    }>,
    campaignData: {
      subject: string;
      template: string;
      campaignId: string;
      content: Record<string, any>;
    }
  ): Promise<{ batchId: string; queued: number }> {
    const enrichedRecipients = recipients.map(recipient => ({
      email: recipient.email,
      name: recipient.name,
      context: {
        segment: recipient.segment,
        personalizedOffer: this.generatePersonalizedOffer(recipient),
        unsubscribeUrl: `${process.env.APP_URL}/unsubscribe/${recipient.email}`,
        preferencesUrl: `${process.env.APP_URL}/preferences/${recipient.email}`,
        ...recipient.preferences,
      }
    }));

    return this.sendBulkEmails(
      enrichedRecipients,
      campaignData.subject,
      campaignData.template,
      campaignData.content,
      {
        campaignId: campaignData.campaignId,
        tags: ['marketing', 'campaign'],
        trackOpens: true,
        trackClicks: true,
        deliveryTime: this.calculateOptimalDeliveryTime(),
      }
    );
  }

  /**
   * Send system maintenance notification
   */
  async sendMaintenanceNotification(
    userEmails: string[],
    maintenanceData: {
      startTime: Date;
      endTime: Date;
      description: string;
      affectedServices: string[];
    }
  ): Promise<{ batchId: string; queued: number }> {
    const recipients = userEmails.map(email => ({ email }));

    return this.sendBulkEmails(
      recipients,
      '🔧 Scheduled Maintenance Notification',
      'maintenance-notification',
      {
        startTime: maintenanceData.startTime,
        endTime: maintenanceData.endTime,
        description: maintenanceData.description,
        affectedServices: maintenanceData.affectedServices,
        duration: this.calculateDuration(maintenanceData.startTime, maintenanceData.endTime),
        statusPageUrl: `${process.env.APP_URL}/status`,
      },
      {
        tags: ['system', 'maintenance', 'notification'],
        priority: 'high',
        deliveryTime: new Date(maintenanceData.startTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
      }
    );
  }

  // ✅ Helper methods
  private generateTrackingUrl(carrier: string, trackingNumber: string): string {
    const carriers = {
      'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'usps': `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
      'dhl': `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
    };
    
    return carriers[carrier.toLowerCase()] || `#tracking-${trackingNumber}`;
  }

  private generatePersonalizedOffer(recipient: any): string {
    // Logic to generate personalized offers based on user data
    const offers = ['10% off', '20% off', 'Free shipping', 'Buy 1 get 1'];
    return offers[Math.floor(Math.random() * offers.length)];
  }

  private calculateOptimalDeliveryTime(): Date {
    // Send at 10 AM next business day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    // Skip weekends
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // Sunday -> Monday
    if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2); // Saturday -> Monday
    
    return tomorrow;
  }

  private calculateDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} hours`;
    return `${hours} hours ${minutes} minutes`;
  }
}
