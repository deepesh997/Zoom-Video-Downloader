'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractMetadata, startConversion, getJobStatus, getDownloadUrl } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function DownloadForm({ onHistoryUpdate }: { onHistoryUpdate: (job: any) => void }) {
  const [url, setUrl] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [format, setFormat] = useState('mp4');
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleExtract = async () => {
    try {
      setLoading(true);
      const data = await extractMetadata(url, passcode);
      if (data.requiresPasscode) {
        setNeedsPasscode(true);
        toast('Passcode required', { description: 'Please enter the recording passcode.' });
      } else if (data.error) {
        toast.error('Error', { description: data.error });
      } else {
        setMetadata(data);
        setNeedsPasscode(false);
        toast.success('Success', { description: 'Recording extracted. Ready for conversion.' });
      }
    } catch (error: any) {
      toast.error('Extraction failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!metadata?.videoUrl) return;
    try {
      setLoading(true);
      const data = await startConversion(metadata.videoUrl, format, metadata.title, metadata.cookies);
      setJobId(data.jobId);
      pollStatus(data.jobId);
    } catch (error: any) {
      toast.error('Conversion failed', { description: error.message });
      setLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(id);
        setProgress(status.progress || 0);
        
        if (status.state === 'completed') {
          clearInterval(interval);
          setLoading(false);
          toast.success('Completed', { description: 'Your file is ready to download.' });
          const jobData = { id, title: metadata?.title, format, date: new Date().toISOString() };
          onHistoryUpdate(jobData);
        } else if (status.state === 'failed') {
          clearInterval(interval);
          setLoading(false);
          toast.error('Failed', { description: status.failedReason });
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 2000);
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto p-6 bg-zinc-950/50 backdrop-blur-md rounded-xl border border-zinc-800 shadow-2xl">
      <h2 className="text-2xl font-semibold text-white tracking-tight">New Download</h2>
      <div className="space-y-4">
        {!metadata ? (
          <>
            <Input 
              placeholder="Paste Zoom recording URL..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
            {needsPasscode && (
              <Input 
                type="password"
                placeholder="Passcode" 
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={loading}
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            )}
            <Button onClick={handleExtract} disabled={loading || !url} className="w-full">
              {loading ? 'Extracting...' : 'Extract'}
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
              <p className="text-sm font-medium text-zinc-200 truncate">{metadata.title}</p>
              <Select value={format} onValueChange={setFormat} disabled={loading}>
                <SelectTrigger className="w-full bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (Video)</SelectItem>
                  <SelectItem value="mp3">MP3 (Audio)</SelectItem>
                  <SelectItem value="wav">WAV (Audio)</SelectItem>
                  <SelectItem value="m4a">M4A (Audio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {jobId && progress > 0 && progress < 100 && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-zinc-400 text-right">{progress}%</p>
              </div>
            )}
            
            {!jobId ? (
              <Button onClick={handleConvert} disabled={loading} className="w-full">
                Convert & Download
              </Button>
            ) : progress === 100 ? (
              <Button onClick={() => window.location.href = getDownloadUrl(jobId)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Download Now
              </Button>
            ) : null}
            
            <Button variant="ghost" onClick={() => { setMetadata(null); setJobId(null); setProgress(0); }} disabled={loading} className="w-full">
              Start Over
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
