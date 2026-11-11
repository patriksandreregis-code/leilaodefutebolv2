import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESENHA_FROM_EMAIL");
const SITE_URL = "https://leilaodefutebolv2.onrender.com";
const TABLE = "resenha_email_reminders";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function authAdmin(path: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users${path}`, {
    headers: headers(),
  });
  if (!response.ok) {
    throw new Error(`Auth Admin HTTP ${response.status}: ${(await response.text()).slice(0, 250)}`);
  }
  return await response.json();
}

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: headers({
      Prefer: "return=representation",
      ...(init.headers as Record<string, string> || {}),
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Database HTTP ${response.status}: ${body.slice(0, 250)}`);
  return body ? JSON.parse(body) : [];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]!));
}

function reminderHtml(name: string) {
  const safeName = escapeHtml(name || "jogador");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080d0b;font-family:Arial,Helvetica,sans-serif;color:#f4f6f4;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080d0b;padding:30px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#101713;border:1px solid #29372d;border-radius:18px;overflow:hidden;">
<tr><td align="center" style="padding:28px 20px;background:#142018;"><img src="${SITE_URL}/logo.png" width="72" height="72" alt="Resenha do Fut" style="display:block;object-fit:contain;"><div style="margin-top:10px;font-size:13px;font-weight:900;letter-spacing:2px;">RESENHA <span style="color:#a8ff3f;">DO FUT.</span></div></td></tr>
<tr><td style="padding:28px 30px 32px;"><div style="text-align:center;color:#a8ff3f;font-size:11px;font-weight:900;letter-spacing:1.6px;">NÃO DEIXE SUA CONTA EXPIRAR</div>
<h1 style="margin:12px 0 16px;text-align:center;font-size:28px;line-height:1.15;color:#fff;">Falta confirmar seu e-mail, ${safeName}!</h1>
<p style="font-size:15px;line-height:1.7;color:#c4cec6;">Sua conta no Resenha do Fut ainda está aguardando confirmação. É só confirmar seu endereço para manter seu perfil ativo e participar do ranking com seus pontos e conquistas.</p>
<div style="margin:22px 0;padding:15px 16px;border:1px solid #65552a;border-left:4px solid #ffd45a;border-radius:9px;background:#211e13;color:#f0e4bd;font-size:13px;line-height:1.6;"><strong style="color:#ffe28a;">Atenção:</strong> contas não confirmadas serão excluídas automaticamente ao completar 7 dias do cadastro.</div>
<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:24px auto;"><tr><td bgcolor="#a8ff3f" style="border-radius:9px;"><a href="${SITE_URL}/conta" style="display:inline-block;padding:15px 28px;color:#101810;font-size:14px;font-weight:900;text-decoration:none;">ACESSAR MINHA CONTA</a></td></tr></table>
<p style="font-size:12px;line-height:1.6;color:#a6b0a8;">Na página de conta, entre com seu e-mail e senha para conferir o status e concluir a confirmação, se necessário. Se você já confirmou seu e-mail, pode ignorar esta mensagem.</p>
</td></tr><tr><td align="center" style="padding:18px 24px;border-top:1px solid #29372d;color:#77847a;font-size:11px;">Futebol, dados e diversão. · <a href="${SITE_URL}/" style="color:#a8ff3f;text-decoration:none;">Resenha do Fut</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function getReminder(userId: string) {
  const rows = await rest(`${TABLE}?select=user_id,status,attempted_at,sent_at&user_id=eq.${encodeURIComponent(userId)}`);
  return rows[0] ?? null;
}

async function claimReminder(userId: string) {
  const existing = await getReminder(userId);
  if (existing?.status === "sent") return false;
  if (existing?.status === "sending") {
    const attempted = Date.parse(existing.attempted_at || "");
    if (Number.isFinite(attempted) && Date.now() - attempted < 30 * 60 * 1000) return false;
  }
  if (existing) {
    await rest(`${TABLE}?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "sending", attempted_at: new Date().toISOString(), last_error: null }),
    });
    return true;
  }
  const inserted = await rest(`${TABLE}?on_conflict=user_id`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, status: "sending", attempted_at: new Date().toISOString() }),
  });
  return Array.isArray(inserted) && inserted.length > 0;
}

async function sendReminder(user: any) {
  const displayName = user.user_metadata?.display_name || user.user_metadata?.name || "jogador";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `resenha-signup-reminder/${user.id}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [user.email],
      subject: "Sua conta no Resenha do Fut está aguardando confirmação",
      html: reminderHtml(displayName),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 250)}`);
  return payload?.id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!SERVICE_KEY) return json(500, { error: "Supabase Admin key unavailable" });
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    return json(503, { error: "Email provider is not configured; no reminders were sent." });
  }

  const now = Date.now();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  let scanned = 0, eligible = 0, sent = 0, skipped = 0, failed = 0;

  try {
    for (let page = 1; page <= 100; page++) {
      const result = await authAdmin(`?page=${page}&per_page=1000`);
      const users = Array.isArray(result?.users) ? result.users : [];
      scanned += users.length;

      for (const listed of users) {
        if (!listed.email || listed.email_confirmed_at) { skipped++; continue; }
        const createdAt = Date.parse(listed.created_at || "");
        if (!Number.isFinite(createdAt) || createdAt > threeDaysAgo || createdAt <= sevenDaysAgo) continue;
        eligible++;

        // Recheck the live Auth record immediately before sending.
        const currentResult = await authAdmin(`/${encodeURIComponent(listed.id)}`);
        const user = currentResult?.user ?? currentResult;
        if (!user?.email || user.email_confirmed_at) { skipped++; continue; }
        const currentCreatedAt = Date.parse(user.created_at || "");
        if (!Number.isFinite(currentCreatedAt) || currentCreatedAt > threeDaysAgo || currentCreatedAt <= sevenDaysAgo) {
          skipped++;
          continue;
        }

        if (!await claimReminder(user.id)) { skipped++; continue; }
        try {
          const providerId = await sendReminder(user);
          await rest(`${TABLE}?user_id=eq.${encodeURIComponent(user.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerId, last_error: null }),
          });
          sent++;
        } catch (error) {
          await rest(`${TABLE}?user_id=eq.${encodeURIComponent(user.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "failed", last_error: String(error).slice(0, 500) }),
          }).catch(() => null);
          failed++;
          console.error("Reminder failed for user", user.id, error);
        }
      }
      if (users.length < 1000) break;
    }
    return json(200, { ok: true, policy: "one_reminder_between_day_3_and_day_7_only_if_unconfirmed", scanned, eligible, sent, skipped, failed });
  } catch (error) {
    console.error("remind-unverified-users failed:", error);
    return json(500, { error: "Reminder run failed; inspect function logs." });
  }
});
