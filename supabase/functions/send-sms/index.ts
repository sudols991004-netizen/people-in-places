import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SOLAPI_API_KEY    = Deno.env.get('SOLAPI_API_KEY')    ?? '';
const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET') ?? '';
const SENDER_PHONE      = Deno.env.get('SENDER_PHONE')      ?? '';

const SUPABASE_URL      = 'https://kracfwphcfoxsapwauyh.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const resHeaders = { 'Content-Type': 'application/json', ...CORS_HEADERS };
  const supabase   = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { action, phone, code } = await req.json();

    // ── 인증번호 발송 ──────────────────────────────────────
    if (action === 'send') {
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, message: '휴대폰 번호가 필요합니다.' }),
          { status: 400, headers: resHeaders }
        );
      }

      const otp  = generateOtp();
      const date = new Date().toISOString();
      const salt = crypto.randomUUID().replace(/-/g, '');

      const encoder = new TextEncoder();
      const keyObj  = await crypto.subtle.importKey(
        'raw', encoder.encode(SOLAPI_API_SECRET),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sigBuffer = await crypto.subtle.sign('HMAC', keyObj, encoder.encode(date + salt));
      const signature = Array.from(new Uint8Array(sigBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const authorization = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

      const solapiRes = await fetch('https://api.solapi.com/messages/v4/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authorization },
        body: JSON.stringify({
          message: {
            to:   phone,
            from: SENDER_PHONE,
            text: `[PEOPLE IN PLACES] 인증번호: ${otp} (3분 이내 입력)`,
          }
        }),
      });

      const solapiData = await solapiRes.json();

      if (!solapiRes.ok) {
        console.error('Solapi 오류:', JSON.stringify(solapiData));
        return new Response(
          JSON.stringify({ success: false, message: 'SMS 발송에 실패했습니다.' }),
          { status: 500, headers: resHeaders }
        );
      }

      // 인증번호 DB에 저장 (3분 유효)
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      await supabase.from('otp_verifications').upsert({ phone, code: otp, expires_at: expiresAt });

      return new Response(
        JSON.stringify({ success: true, message: '인증번호가 발송되었습니다.' }),
        { status: 200, headers: resHeaders }
      );
    }

    // ── 인증번호 검증 ──────────────────────────────────────
    if (action === 'verify') {
      if (!phone || !code) {
        return new Response(
          JSON.stringify({ success: false, message: '휴대폰 번호와 인증번호가 필요합니다.' }),
          { status: 400, headers: resHeaders }
        );
      }

      const { data: stored } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone', phone)
        .single();

      if (!stored) {
        return new Response(
          JSON.stringify({ success: false, message: '인증번호를 먼저 발송해주세요.' }),
          { status: 400, headers: resHeaders }
        );
      }
      if (new Date() > new Date(stored.expires_at)) {
        await supabase.from('otp_verifications').delete().eq('phone', phone);
        return new Response(
          JSON.stringify({ success: false, message: '인증번호가 만료되었습니다. 다시 발송해주세요.' }),
          { status: 400, headers: resHeaders }
        );
      }
      if (stored.code !== code) {
        return new Response(
          JSON.stringify({ success: false, message: '인증번호가 올바르지 않습니다.' }),
          { status: 400, headers: resHeaders }
        );
      }

      // 인증 성공 — DB에서 삭제
      await supabase.from('otp_verifications').delete().eq('phone', phone);
      return new Response(
        JSON.stringify({ success: true, message: '인증이 완료되었습니다.' }),
        { status: 200, headers: resHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: '잘못된 요청입니다.' }),
      { status: 400, headers: resHeaders }
    );

  } catch (err) {
    console.error('Edge Function 오류:', err);
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: resHeaders }
    );
  }
});