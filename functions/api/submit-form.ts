import { sendLeadToMetaCapi } from './_lib/meta-capi';

interface Env {
  APPS_SCRIPT_URL?: string;
  META_PIXEL_ID?: string;
  META_ACCESS_TOKEN?: string;
}

const FALLBACK_URL = 'https://script.google.com/macros/s/AKfycbyxQUW8uO_zLxphyCAwK7m4ew4aExanEKYU1ytqk5Ekah5i845b5KMRb6gEgKW9byXK/exec';
const DEFAULT_PIXEL_ID = '1336546998650554';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const targetUrl = env.APPS_SCRIPT_URL || FALLBACK_URL;
  const pixelId = env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const accessToken = env.META_ACCESS_TOKEN;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Body inválido (JSON esperado)' }, { status: 400 });
  }

  // Apps Script V2 lê body como JSON (JSON.parse no postData.contents).
  // Mapeia "whatsapp" → "telefone" (campo esperado pelo script V2).
  const { whatsapp, eventID, fbc, fbp, source_url, test_event_code, event_name, ...rest } = payload as Record<string, unknown>;
  const upstreamPayload = whatsapp !== undefined
    ? { ...rest, telefone: whatsapp }
    : rest;

  // 1. Envia para o Apps Script (grava na planilha)
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(upstreamPayload),
      redirect: 'manual',
    });
  } catch (err) {
    return Response.json(
      { success: false, error: `Falha ao chamar Apps Script: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const isRedirect = upstream.status >= 300 && upstream.status < 400;
  if (!upstream.ok && !isRedirect) {
    const text = await upstream.text();
    return Response.json(
      { success: false, error: `Apps Script retornou ${upstream.status}`, upstreamBody: text.slice(0, 200) },
      { status: 502 },
    );
  }

  // 2. Envia para Meta Conversions API (se token configurado)
  // Acontece em paralelo, mas não bloqueia o sucesso do submit caso falhe.
  let capiResult: { success: boolean; error?: string } | undefined;
  if (accessToken && eventID) {
    capiResult = await sendLeadToMetaCapi(pixelId, accessToken, {
      eventName: event_name ? String(event_name) : 'Lead',
      eventId: String(eventID),
      eventSourceUrl: source_url ? String(source_url) : undefined,
      userData: {
        email: rest.email ? String(rest.email) : undefined,
        phone: whatsapp ? String(whatsapp) : undefined,
        fbc: fbc ? String(fbc) : undefined,
        fbp: fbp ? String(fbp) : undefined,
        clientIp: request.headers.get('cf-connecting-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
      customData: {
        content_name: rest.campaign,
        content_category: rest.source,
      },
      testEventCode: test_event_code ? String(test_event_code) : undefined,
    });

    if (!capiResult.success) {
      console.warn('[CAPI] Falha ao enviar evento Lead:', capiResult.error);
    }
  }

  return Response.json({
    success: true,
    capi: capiResult ? { sent: capiResult.success } : { sent: false, reason: 'token-not-configured' },
  }, { status: 200 });
};

export const onRequest: PagesFunction = () =>
  new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
