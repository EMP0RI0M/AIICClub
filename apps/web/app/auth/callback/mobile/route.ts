import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Construct forward params string
  const forwardParams = new URLSearchParams();
  if (code) forwardParams.set("code", code);
  if (error) forwardParams.set("error", error);
  if (errorDescription) forwardParams.set("error_description", errorDescription);

  const queryStr = forwardParams.toString() ? `?${forwardParams.toString()}` : "";
  const mobileTarget = `aiic://auth/callback${queryStr}`;

  // Deliver lightweight HTML page that fires immediate deep link + hash fragment preservation + fallback button
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Returning to AIIC...</title>
  <style>
    body {
      background-color: #07090D;
      color: #F5F7FA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: rgba(18, 22, 30, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin-bottom: 20px;
      box-shadow: 0 0 24px rgba(232, 163, 61, 0.35);
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 800;
    }
    p {
      color: rgba(245, 247, 250, 0.65);
      font-size: 14px;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .btn {
      display: block;
      background: linear-gradient(135deg, #F59E0B, #D97706);
      color: #000;
      text-decoration: none;
      font-weight: 800;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3);
      transition: opacity 0.2s;
    }
    .btn:active {
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/corvus-logo.png" alt="AIIC" class="logo">
    <h2>Returning to AIIC Club</h2>
    <p>Authentication complete. Redirecting back to your application...</p>
    <a id="open-app" href="${mobileTarget}" class="btn">Open AIIC App</a>
  </div>

  <script>
    (function() {
      var hash = window.location.hash || '';
      var search = window.location.search || '';
      var finalUrl = 'aiic://auth/callback' + search + hash;
      
      var btn = document.getElementById('open-app');
      if (btn) btn.href = finalUrl;
      
      // Auto-bounce immediately
      window.location.replace(finalUrl);
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
