# Zoom Video Downloader

A full-stack application to download and convert Zoom cloud recordings into various formats.

## Features
- Paste a Zoom cloud recording URL to extract the video.
- Support for public and passcode-protected recordings.
- Convert downloads to MP4, MP3, WAV, or M4A formats.
- Real-time progress indicators using a modern Next.js UI.
- Automated cleanup of temporary files.
- Robust queue system using BullMQ and Redis.
- Playwright-powered metadata extraction.

## Tech Stack
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Playwright, FFmpeg
- **Infrastructure**: Docker, Redis, BullMQ

## Setup and Run

### Using Docker (Recommended)
1. Ensure Docker and Docker Compose are installed.
2. Clone this repository.
3. Run the following command in the root directory:
   ```bash
   docker-compose up --build
   ```
4. Access the frontend at `http://localhost:3000`
5. The backend runs on `http://localhost:3001`

### Running Locally

**Prerequisites:**
- Node.js (v18+)
- Redis running on localhost:6379
- FFmpeg installed and accessible in your system PATH

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
Create a `.env` file in the `backend` directory (optional defaults provided):
```
PORT=3001
REDIS_URL=redis://127.0.0.1:6379
```

Create a `.env.local` in the `frontend` directory:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Notes
- **Legal Compliance:** Ensure you have the right to download and process these videos.
- **Playwright:** The extractor uses Playwright. The backend Dockerfile uses the official Microsoft Playwright image to ensure all browser dependencies are installed.
