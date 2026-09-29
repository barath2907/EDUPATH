# 🎓 EduPath — AI-Powered College Admission & Counselling Platform

An advanced, end-to-end AI-powered counselling and college recommendation platform designed specifically for **TNEA (Tamil Nadu Engineering Admissions)** candidates and parents.

---

## ✨ Features & Modules

- 🧠 **AI RAG Counsellor**: Interactive TNEA admissions counsellor powered by Retrieval-Augmented Generation (RAG) with verified cutoff data, eligibility rules, reservation categories, and 3-second animated thinking states.
- 🎯 **AI College Recommendation Engine**: Multi-factor match scoring considering cutoff marks, community quota, preferred branch, location, and placement records.
- ⚖️ **Real-Time College Comparison**: Dynamic visual comparisons across tuition fees, NIRF rankings, highest/average packages, and historical closing cutoffs.
- 📊 **Dynamic Analytical Reports**: Comprehensive downloadable analysis reports with live comparison charts, risk indicators, and choice-filling strategies.
- 📱 **Mobile & PWA Ready**: Fully responsive mobile layout with Progressive Web App (PWA) manifest support for 1-tap installation on Android & iOS.
- 🌐 **Multilingual Support**: Seamless English and Tamil (தமிழ்) localization.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts
- **Build Tooling**: Vite
- **AI & Analytics**: Custom RAG Knowledge Pipeline & Cutoff Matching Engines
- **Deployment**: Vercel / Netlify / Cloudflare Pages / GitHub Pages

---

## 🚀 Getting Started

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

### Production Build

```bash
npm run build
```

---

## 🌐 1-Click Free Deployment

### Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and link your GitHub account.
2. Select the `barath2907/EDUPATH` repository.
3. Click **Deploy** (Vite configuration and SPA rewrites via `vercel.json` are pre-configured).

### Deploy on Netlify
1. Go to [netlify.com](https://netlify.com) and import `barath2907/EDUPATH`.
2. Build command: `npm run build` | Publish directory: `dist`.
3. Click **Deploy**.

---

## 📱 Mobile App Installation (PWA)

1. Open the deployed website on your Android/iOS mobile browser.
2. Tap the browser menu (`⋮` on Chrome / Share icon on Safari) → Tap **"Install App"** or **"Add to Home Screen"**.
3. EduPath runs in full-screen standalone mode like a native app.
