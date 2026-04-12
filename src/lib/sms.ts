// ─── SMS.ru API client ──────────────────────────────────────────────

const SMS_RU_API = 'https://sms.ru/sms/send';

interface SmsResult {
  success: boolean;
  error?: string;
}

/**
 * Send SMS via SMS.ru API.
 * Requires SMS_RU_API_KEY env variable.
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const apiKey = process.env.SMS_RU_API_KEY;

  if (!apiKey) {
    // Without SMS_RU_API_KEY, log code to console (check Coolify logs)
    console.log(`[SMS] API key not configured. To: ${phone}, Message: ${message}`);
    return { success: true };
  }

  const params = new URLSearchParams({
    api_id: apiKey,
    to: phone,
    msg: message,
    json: '1',
  });

  try {
    const response = await fetch(`${SMS_RU_API}?${params.toString()}`);

    if (!response.ok) {
      return { success: false, error: `SMS.ru HTTP error: ${response.status}` };
    }

    const data = await response.json();

    // SMS.ru returns status_code=100 for success
    if (data.status_code === 100 || data.status === 'OK') {
      return { success: true };
    }

    // Check per-phone status
    const phoneStatus = data.sms?.[phone];
    if (phoneStatus?.status_code === 100) {
      return { success: true };
    }

    return {
      success: false,
      error: `SMS.ru error: status_code=${data.status_code}, status=${data.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: `SMS send failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Send OTP code via SMS.
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsResult> {
  const message = `Код входа: ${code}. Не сообщайте никому. Штрафометр`;
  return sendSms(phone, message);
}
