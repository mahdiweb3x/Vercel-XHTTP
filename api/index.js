export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");
// یک مسیر طولانی و رندوم برای تانل انتخاب کن
const SECRET_PATH = "/mahdi1"; 

const STRIP_HEADERS = new Set([
  "host", "connection", "keep-alive", "proxy-authenticate", 
  "proxy-authorization", "te", "trailer", "transfer-encoding", 
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port"
]);

export default async function handler(req) {
  const url = new URL(req.url);

  // ۱. استتار: اگر مسیر شامل کلید مخفی نباشد، یک صفحه جعلی نشان بده
  if (!url.pathname.startsWith(SECRET_PATH)) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding-top:50px;">
      <h1>Site Under Maintenance</h1>
      <p>We're performing some scheduled updates. Please check back later.</p>
      </body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (!TARGET_BASE) {
    return new Response("Configuration Error", { status: 500 });
  }

  try {
    // استخراج مسیر واقعی از بعد از SECRET_PATH
    const actualPath = url.pathname.slice(SECRET_PATH.length) + url.search;
    const targetUrl = TARGET_BASE + (actualPath.startsWith("/") ? actualPath : "/" + actualPath);

    const out = new Headers();
    for (const [k, v] of req.headers) {
      if (STRIP_HEADERS.has(k.toLowerCase()) || k.toLowerCase().startsWith("x-vercel-")) continue;
      out.set(k, v);
    }

    // اضافه کردن یک هدر جعلی برای عادی جلوه دادن ترافیک
    out.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    const res = await fetch(targetUrl, {
      method: req.method,
      headers: out,
      body: req.body,
      duplex: "half",
      redirect: "manual",
    });

    const respHeaders = new Headers(res.headers);
    respHeaders.delete("content-encoding");

    return new Response(res.body, {
      status: res.status,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response("Service Unavailable", { status: 503 });
  }
}
