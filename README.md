# FIBO Studio

A professional 3D product photography studio powered by AI. Create stunning photorealistic product images using an intuitive 3D scene editor and BRIA FIBO's JSON-native image generation.

![FIBO Studio](https://img.shields.io/badge/FIBO-Studio-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-R3F-black?style=flat-square&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248?style=flat-square&logo=mongodb)

## Overview

FIBO Studio bridges the gap between 3D scene composition and AI-powered image generation. Instead of struggling with text prompts, you visually design your product scene in a real-time 3D editor, and FIBO translates your exact camera angles, lighting, and composition into photorealistic images.

### Key Features

- **Interactive 3D Scene Editor** - Position, rotate, and scale objects with intuitive transform controls
- **Real-time Lighting Control** - Adjust key, fill, and rim lights with live preview
- **AI-Powered Image Generation** - Generate photorealistic product photos using BRIA FIBO
- **JSON-Native Controls** - Precise camera angles, lighting, and composition through structured parameters
- **Project Management** - Save, organize, and manage multiple product photography projects
- **User Authentication** - Secure signup/login with JWT, plus demo mode for quick testing
- **Production Gallery** - View and download all generated images

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  3D Scene   │  │   Studio    │  │     Dashboard       │  │
│  │  (Three.js) │  │  Controls   │  │   (Projects/Auth)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Services Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ FIBO Service│  │Gemini Service│ │    API Service      │  │
│  │(Image Gen)  │  │(Prompt Parse)│ │  (Backend Comm)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express + Node.js)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Auth     │  │  Projects   │  │    Middleware       │  │
│  │   Routes    │  │   Routes    │  │   (JWT Auth)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     MongoDB Atlas                           │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │    Users    │  │              Projects               │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Three.js / React Three Fiber** - 3D rendering
- **@react-three/drei** - Three.js helpers
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### AI Services
- **BRIA FIBO** - JSON-native image generation
- **Google Gemini** - Natural language prompt interpretation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- BRIA API key ([Get one here](https://bria.ai/))
- Google Gemini API key ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SatyaPujith/fibo-studio.git
   cd fibo-studio
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure environment variables**

   Create `.env.local` in the root directory:
   ```env
   # Gemini API Key (for prompt interpretation)
   VITE_GEMINI_API_KEY=your_gemini_api_key
   API_KEY=your_gemini_api_key

   # BRIA FIBO API Key (for image generation)
   VITE_FIBO_API_KEY=your_fibo_api_key
   FIBO_API_KEY=your_fibo_api_key

   # Backend API URL
   VITE_API_URL=http://localhost:5000/api
   ```

   Create `server/.env`:
   ```env
   # MongoDB Connection
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fibostudio

   # JWT Secret (generate a random string)
   JWT_SECRET=your_super_secret_jwt_key

   # Server Port
   PORT=5000

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

6. **Start the frontend (in a new terminal)**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Quick Start (Demo Mode)

1. Click "Try Demo" on the landing page
2. A sample project will be created automatically
3. Explore the 3D editor and generate images
4. Note: Demo mode stores data locally only

### Full Experience

1. **Sign Up** - Create an account with email and password
2. **Create Project** - Click "New Project" in the dashboard
3. **Design Scene**:
   - Use transform tools (Move, Rotate, Scale) to position objects
   - Adjust lighting with the right panel controls
   - Apply mood presets (Clean, Dark, Warm, Cool)
4. **Generate Images**:
   - Click "Generate Image" to open the batch dialog
   - Add variations or generate the current view
   - Images appear in the Production Gallery
5. **Download** - Hover over any image and click the download button

### Studio Controls

| Control | Action |
|---------|--------|
| Left Click + Drag | Rotate camera |
| Right Click + Drag | Pan camera |
| Scroll | Zoom in/out |
| W/E/R | Switch transform mode (Move/Rotate/Scale) |
| Click Object | Select object |

### AI Prompt Director

Type natural language commands in the "Studio Director" input:
- "Make it look cinematic with dramatic lighting"
- "Create a vintage camera"
- "Add warm golden hour lighting"
- "Make the background dark and moody"

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/demo` | POST | Demo login (no database) |
| `/api/auth/me` | GET | Get current user |

### Projects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects/:id` | GET | Get single project |
| `/api/projects` | POST | Create project |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/projects/:id/images` | POST | Add generated image |
| `/api/projects/stats/summary` | GET | Get user statistics |

## Project Structure

```
fibo-studio/
├── components/
│   ├── AuthPage.tsx        # Login/Signup UI
│   ├── Dashboard.tsx       # Project management
│   ├── LandingPage.tsx     # Marketing page
│   ├── Scene3D.tsx         # Three.js 3D scene
│   ├── Studio.tsx          # Main editor interface
│   └── ...dialogs
├── services/
│   ├── apiService.ts       # Backend API client
│   ├── fiboService.ts      # BRIA FIBO integration
│   ├── geminiService.ts    # Gemini AI integration
│   └── storageService.ts   # Local storage
├── server/
│   ├── models/
│   │   ├── User.ts         # User schema
│   │   └── Project.ts      # Project schema
│   ├── routes/
│   │   ├── auth.ts         # Auth endpoints
│   │   └── projects.ts     # Project endpoints
│   ├── middleware/
│   │   └── auth.ts         # JWT middleware
│   └── index.ts            # Express server
├── App.tsx                 # Main app component
├── types.ts                # TypeScript types
├── constants.ts            # Default configs
└── index.tsx               # Entry point
```

## FIBO Integration

FIBO Studio leverages BRIA FIBO's JSON-native control system for precise image generation:

```typescript
// Example FIBO parameters generated from 3D scene
{
  prompt: "Single Product, eye level view, front view, solid white background...",
  scene: {
    subject: "Product Name",
    background: "white",
    environment: "studio"
  },
  camera: {
    angle: "eye_level",
    shot_type: "medium_shot",
    position: "front"
  },
  lighting: {
    type: "studio",
    direction: "front",
    intensity: "medium"
  },
  style: {
    type: "photorealistic",
    quality: "ultra"
  }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [BRIA AI](https://bria.ai/) for the FIBO image generation model
- [Google](https://ai.google.dev/) for the Gemini API
- [Three.js](https://threejs.org/) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for 3D rendering
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

Built with ❤️ for creators who want precise control over AI-generated product photography.
