'use client';

import { useState } from 'react';
import DownloadForm from '@/components/DownloadForm';
import DownloadHistory from '@/components/DownloadHistory';
import { Toaster } from '@/components/ui/sonner';

export default function Home() {
  const [newJob, setNewJob] = useState<any>(null);

  return (
    <main className="min-h-screen bg-black text-white selection:bg-emerald-500/30 flex flex-col items-center py-20 px-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black -z-10" />
      
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
          Zoom Video Downloader
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto text-sm md:text-base">
          Paste your Zoom cloud recording link to automatically extract and convert it into your preferred format.
        </p>
      </div>

      <DownloadForm onHistoryUpdate={(job) => setNewJob(job)} />
      <DownloadHistory newJob={newJob} />
      
      <Toaster />
    </main>
  );
}
