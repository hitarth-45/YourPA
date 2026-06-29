# YourPa 🚀
### *Your Personal Adaptive Co-Pilot Dashboard*

**YourPa** (Your Personal Assistant) is an immersive, single-screen full-stack productivity dashboard designed to solve the cognitive friction of task coordination, time-estimation bias, and procrastination. Rather than acting as a static text list, YourPa functions as a dynamic execution co-pilot, utilizing Google's advanced Gemini API to break down task lists into predictive human-time pacing schedules and insulated buffer zones.

---

## 🌌 Core Vision & Problem Statement

### The Problem: The Planning Fallacy & Passive Intentions
Most traditional task management systems operate as passive text repositories. They capture *what* you need to do, but they fail to support *how* and *when* to execute. Users frequently fall victim to the **Planning Fallacy**—systematically underestimating the time and resources required for complex actions—leading to late-stage anxiety, high-friction rush windows, and cognitive burnout.

### The Solution: An Immersive Adaptive Co-Pilot
**YourPa** transforms passive entries into active **"Mission Briefings."** It calculates dynamic scheduling structures, balances automated speed expectations against human-focused pacing, builds tailored step-by-step subtask checklists, and integrates proactive safety padding. Coupled with hands-free voice dictation, YourPa cushions execution and keeps you on-pace with visual and auditory feedback.

---

## ⚡ Key Product Features

- **🤖 AI Predictive Time Diagnostics**: Instantly compares estimated human execution benchmarks with automated machine-time metrics, illustrating performance variations in a clean interactive line-and-bar chart.
- **🛡️ Proactive Safety Buffering**: Automatically provisions custom time buffers (padding) to insulate tasks against real-world interruptions and planning fatigue.
- **🎙️ Hands-Free Voice Assisted Entry**: Dictate your task briefings naturally. Our semantic voice-processing parser extracts titles, infers deadlines, and automatically determines priority levels.
- **⏰ Live Deadline Matrix**: Prioritizes checklists into structured tiers (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) accompanied by high-fidelity live countdown timers and status alerts.
- **🎯 Focus Mode & Pacing Planner**: Activates an on-screen workspace tracking custom subtask checklists, dynamic pause timers, and interactive completion logs.
- **📊 Daily Habits Compliance**: Tracks streaking behaviors and visual completion compliance grids for recurring routine tasks.

---

## 🛠️ System Architecture & Technologies Used

### Front-End (Client)
- **Framework**: React 19 (TypeScript) orchestrated with Vite.
- **Styling**: Tailwind CSS v4 for responsive layout utility classes.
- **Animation Engine**: Motion (`motion/react`) for smooth page transition ripples and active timer indicators.
- **Visual Charts**: `recharts` for modeling predictive time comparisons and user logs.
- **Icons**: `lucide-react` vector iconography.

### Back-End (Server)
- **Server Framework**: Node.js & Express.ts.
- **Bundler & Compiler**: `esbuild` for compiling TypeScript code into high-speed server bundles.

### Google Ecosystem Integration
- **Google Gemini API (`Gemini 3.5 Flash`)**: Core engine powering semantic task analysis, automated priority assignments, and subtask generation.
- **Google Cloud Run**: Low-latency, containerized cloud infrastructure hosting the full-stack server-side application.

---

## 📂 Project Structure

```bash
├── server.ts                    # Full-Stack Express Server (API Proxy, Gemini API gateway)
├── src/
│   ├── App.tsx                  # Main Client Application Dashboard
│   ├── types.ts                 # Type definitions & structured schemas
│   ├── index.css                # Global CSS (Imports Tailwind CSS v4)
│   ├── main.tsx                 # Client bootstrapping and rendering
│   └── components/
│       ├── TaskForm.tsx         # Voice-assisted mission briefing form
│       └── PanicDashboard.tsx   # Urgent deadline timers & tracking
├── firebase-applet-config.json  # Firebase Project Configuration credentials
├── package.json                 # Node dependencies and build scripts
└── tsconfig.json                # TypeScript project rules
