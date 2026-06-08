# Stella Avatar — Frontend

> **Next.js 16 web portal for the Stella AI voice assistant with real-time LiveKit integration**

The frontend provides:
- 🎙️ **Live Voice Portal** — browser microphone → LiveKit room → Stella agent
- 💬 **Real-time Chat Transcript** — voice-to-text displayed as chat bubbles
- 🧊 **3D Avatar** — WebGL MetaHuman-style face driven by A2F blendshapes (via WebSocket)
- 🖥️ **Unreal Engine Viewer** — embedded Pixel Streaming iframe (optional)
- 🔐 **Auth Pages** — login / register
- 🎫 **Admin Dashboard** — upload knowledge base documents, view tickets
- 🏢 **Department Portal** — per-department support views

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | React framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| LiveKit SDK | Real-time voice room |
| Three.js / React Three Fiber | 3D avatar rendering |
| @pixiv/three-vrm | VRM avatar support |
| Zustand | Global state management |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/<your-org>/stella-avatar-frontend.git
cd stella-avatar-frontend

npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** The backend agent must be running for voice features to work.
> See [stella-avatar-backend](https://github.com/<your-org>/stella-avatar-backend) for setup.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_LIVEKIT_URL` | Your LiveKit WebSocket URL (e.g. `wss://xxx.livekit.cloud`) |
| `NEXT_PUBLIC_LIVEKIT_TOKEN_URL` | Backend token endpoint (default: `http://localhost:8081/token`) |
| `NEXT_PUBLIC_API_URL` | Backend FastAPI URL (default: `http://localhost:8000`) |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout (fonts, metadata)
│   │   ├── globals.css        # Global styles
│   │   ├── live/              # 🎙️ Live voice portal (main feature)
│   │   ├── portal/            # User self-service portal
│   │   ├── admin/             # Admin: upload docs, view tickets
│   │   ├── department/        # Department-specific views
│   │   ├── login/             # Auth: login
│   │   ├── register/          # Auth: register
│   │   ├── ue5/               # Unreal Engine Pixel Streaming viewer
│   │   └── api/               # Next.js API routes
│   ├── components/
│   │   ├── AvatarWidget.tsx   # Main voice + avatar widget
│   │   ├── StellaWidget.tsx   # Stella chat + transcript widget
│   │   ├── A2FAvatar.tsx      # WebGL face driven by A2F blendshapes (WebSocket)
│   │   ├── Avatar3D.tsx       # Three.js GLB/VRM avatar renderer
│   │   └── VRMAvatar.tsx      # VRM-specific avatar component
│   └── store/                 # Zustand global state
├── public/
│   ├── avatar.vrm             # VRM 3D avatar model
│   ├── model.glb              # GLB 3D avatar model
│   └── stella.png             # Avatar profile image
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.local.example         # ← copy to .env.local
└── .gitignore
```

---

## Pages Overview

### `/live` — Voice Portal
The core feature. Connects to the LiveKit room, streams your microphone to the Stella agent, and displays:
- Real-time voice transcript
- 3D animated avatar (driven by A2F blendshapes via WebSocket on `ws://localhost:11112`)
- Chat history

### `/ue5` — Unreal Engine Viewer
Embeds the Pixel Streaming signalling server output so you can view the MetaHuman face directly in the browser without installing Unreal Engine.

### `/admin` — Admin Dashboard
Upload PDF/TXT policy documents to the Qdrant RAG knowledge base. View and manage support tickets.

---

## Full System Setup

For the complete system (voice agent + face animation) you need:

1. **Backend running** → `cd backend && .\start_agent.ps1`
2. **A2F NIM running** → `cd backend && .\run_a2f.ps1`
3. **Unreal Engine open** with Live Link connected to `localhost:11111`
4. **Frontend running** → `npm run dev`
5. Open `http://localhost:3000/live` and speak!

---

## License

MIT
