# GradRoulette - Production Deployment & Testing Guide

This guide outlines the step-by-step configurations needed to take **GradRoulette** to production and start testing it with real users on live networks.

---

## 💻 1. Hosting Deployments

To make the app accessible to real users, you need to host both the frontend and the backend on the web.

### A. Backend Deployment (Node.js/Express)
You can deploy the backend to platforms like **Railway**, **Render**, or **Fly.io**:
1. Connect your GitHub repository (`https://github.com/aimadhav/gradroulette.git`) to the platform.
2. Select the `/backend` directory to build.
3. Configure the **Build Command** to: `npm run build` (which compiles TypeScript via `tsc`).
4. Configure the **Start Command** to: `npm run start` (which runs `node dist/server.js`).
5. Add the following **Environment Variables** in the hosting dashboard:
   - `PORT=8080` (or let the platform inject it dynamically)
   - `JWT_SECRET=your_long_random_production_secret_key`
   - `RESEND_API_KEY=your_production_resend_api_key`
   - `METERED_SECRET_KEY=your_production_metered_secret_key`
   - `METERED_APP_DOMAIN=your_production_metered_app_domain.metered.live`
   - `GOOGLE_CLIENT_ID=663724090489-c28om63efv3vrqfu80mgsnrngtqc9me5.apps.googleusercontent.com`

### B. Frontend Deployment (React/Vite)
You can deploy the frontend to **Vercel**, **Netlify**, or **GitHub Pages**:
1. Connect your GitHub repository to the platform.
2. Select the `/frontend` directory to build.
3. Configure the **Build Command** to: `npm run build` (which compiles `tsc && vite build`).
4. Configure the **Output Directory** to: `dist`.
5. Add the following **Environment Variables** in the hosting dashboard:
   - `VITE_SIGNALING_SERVER_URL=https://your-deployed-backend-url.com` (point this to your live backend endpoint)
   - `VITE_GOOGLE_CLIENT_ID=663724090489-c28om63efv3vrqfu80mgsnrngtqc9me5.apps.googleusercontent.com`

---

## 📧 2. Email Service Setup (Resend)
In development, Resend restricts outgoing emails to your sandbox email (`madhavofficial23@gmail.com`). To send OTP codes to college/work emails:

1. **Add Your Custom Domain:**
   - Log in to [Resend Dashboard](https://resend.com/).
   - Go to **Domains > Add Domain**. Enter your domain (e.g. `gradroulette.com`).
2. **Configure DNS Records:**
   - Resend will generate three **MX**, **TXT (SPF)**, and **CNAME (DKIM)** records.
   - Go to your Domain Registrar (GoDaddy, Namecheap, Route53) and add these records to your DNS settings.
3. **Verify and Lift Sandbox:**
   - Once DNS propagates and the domain resolves as "Verified" in Resend, you can send emails to **any domain/recipient** (like student university emails).
4. **Update Sender Email:**
   - Modify the dispatch sender email in [email.ts](file:///c:/Users/madha/Desktop/webrtc/backend/src/utils/email.ts) from `"GradRoulette <onboarding@resend.dev>"` to your own domain address (e.g. `"GradRoulette <auth@gradroulette.com>"`).

---

## 🔑 3. Google OAuth Setup
Google blocks Sign-in popups on unregistered domains (origin mismatch) and restricts access if the consent screen is in testing.

1. **Move Consent Screen to Production:**
   - Go to [Google Cloud Console OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent).
   - Under **Publishing Status**, click **Publish App** to switch it from **Testing** to **In Production**.
   - *Note:* If you keep it in "Testing", only users you manually register under "Test Users" in the console will be able to log in.
2. **Register Live Origins:**
   - Go to **Credentials**, click on your OAuth 2.0 Client ID.
   - Add your production web URL (e.g., `https://gradroulette.com`) to the **Authorized JavaScript origins** list.
   - If users access the site using `www` or specific port subdomains, register those exact combinations (e.g., `https://www.gradroulette.com`) as well.

---

## 📹 4. WebRTC Relay Setup (Metered.ca)
Without a relay server, video connections fail when users are on separate restricted networks (such as university Wi-Fi or cellular networks behind symmetric NATs).

1. **Activate a TURN Plan:**
   - Log in to your [Metered Dashboard](https://www.metered.ca/).
   - Subscribe to an active **TURN Server plan** (even the basic tier is sufficient).
2. **Configure Keys:**
   - Ensure the `METERED_SECRET_KEY` and `METERED_APP_DOMAIN` are set in your production backend environment variables.
   - The backend `/webrtc/turn-credential` endpoint will automatically begin serving production TURN relay configurations instead of falling back to Google's public STUN servers.

---

## 👥 5. Testing with Real Users
Once deployed:
1. Have User A go to your live frontend URL and click **Sign in with Google** or type their institutional email.
2. Have User B open the live URL on their mobile or another device (using a separate Wi-Fi or cellular connection).
3. Both users verify their identities -> click **Find Match** -> confirm the WebRTC video call connects successfully!
