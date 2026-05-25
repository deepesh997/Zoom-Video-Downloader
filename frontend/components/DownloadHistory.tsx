'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getDownloadUrl } from '@/lib/api';

export default function DownloadHistory({ newJob }: { newJob?: any }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('zoom_downloads');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (newJob) {
      setHistory(prev => {
        const next = [newJob, ...prev].slice(0, 10);
        localStorage.setItem('zoom_downloads', JSON.stringify(next));
        return next;
      });
    }
  }, [newJob]);

  if (history.length === 0) return null;

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto mt-8">
      <h3 className="text-xl font-medium text-white">Recent Downloads</h3>
      <div className="space-y-3">
        {history.map((job, idx) => (
          <Card key={idx} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-zinc-100 truncate">{job.title}</p>
                <p className="text-xs text-zinc-500">{new Date(job.date).toLocaleString()} • {job.format.toUpperCase()}</p>
              </div>
              {job.url && (
                <a 
                  href={getDownloadUrl(job.url, job.format, job.title, job.cookies)} 
                  className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors whitespace-nowrap ml-4"
                >
                  Download Again
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
