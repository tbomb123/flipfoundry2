/**
 * Email Service (Resend)
 * 
 * Send deal alert emails via Resend API.
 * Designed for non-blocking async operation.
 */

import { Resend } from 'resend';

// =============================================================================
// CONFIGURATION
// =============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Initialize Resend client (lazy)
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

// =============================================================================
// TYPES
// =============================================================================

export interface DealAlertEmailData {
  recipientEmail: string;
  searchName: string;
  deals: Array<{
    title: string;
    price: number;
    dealScore: number;
    imageUrl?: string;
    itemUrl: string;
    estimatedProfit?: number;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function generateDealAlertHtml(data: DealAlertEmailData): string {
  const { searchName, deals } = data;
  
  const dealRows = deals.map(deal => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${deal.imageUrl ? `
              <td width="80" style="vertical-align: top; padding-right: 12px;">
                <img src="${deal.imageUrl}" alt="" width="80" height="80" style="border-radius: 8px; object-fit: cover;" />
              </td>
            ` : ''}
            <td style="vertical-align: top;">
              <a href="${deal.itemUrl}" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 14px;">
                ${escapeHtml(deal.title.slice(0, 80))}${deal.title.length > 80 ? '...' : ''}
              </a>
              <div style="margin-top: 8px;">
                <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                  Score: ${deal.dealScore}
                </span>
                <span style="margin-left: 8px; color: #059669; font-weight: 600; font-size: 14px;">
                  $${deal.price.toFixed(2)}
                </span>
                ${deal.estimatedProfit ? `
                  <span style="margin-left: 8px; color: #6b7280; font-size: 12px;">
                    Est. profit: $${deal.estimatedProfit.toFixed(2)}
                  </span>
                ` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deal Alert: ${escapeHtml(searchName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                🔥 FlipFoundry Alert
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${deals.length} deal${deals.length !== 1 ? 's' : ''} found for "${escapeHtml(searchName)}"
              </p>
            </td>
          </tr>
          
          <!-- Deals -->
          <tr>
            <td style="padding: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${dealRows}
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <a href="https://flipfoundry.app/saved-searches" 
                 style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View All Deals →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background: #f1f5f9; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                You're receiving this because you enabled alerts for "${escapeHtml(searchName)}".
                <br>
                <a href="https://flipfoundry.app/saved-searches" style="color: #64748b;">Manage alerts</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================================
// SEND FUNCTIONS
// =============================================================================

/**
 * Send a deal alert email
 */
export async function sendDealAlertEmail(data: DealAlertEmailData): Promise<EmailResult> {
  const resend = getResend();
  
  if (!resend) {
    console.warn('[EMAIL] Resend not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const html = generateDealAlertHtml(data);
  const subject = `🔥 ${data.deals.length} deal${data.deals.length !== 1 ? 's' : ''} found: ${data.searchName}`;

  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject,
      html,
    });

    if (response.error) {
      console.error('[EMAIL] Resend error:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log(`[EMAIL] Sent deal alert to ${data.recipientEmail}: ${response.data?.id}`);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error('[EMAIL] Send error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Send a test email (for verification)
 */
export async function sendTestEmail(recipientEmail: string): Promise<EmailResult> {
  const resend = getResend();
  
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: '✅ FlipFoundry Email Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>Email Configuration Working!</h1>
          <p>Your FlipFoundry alert emails are properly configured.</p>
          <p>You'll receive deal alerts when your saved searches find matching items.</p>
        </div>
      `,
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send test email' 
    };
  }
}
