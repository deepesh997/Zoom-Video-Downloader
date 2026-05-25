'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractMetadata, getDownloadUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function DownloadForm({ onHistoryUpdate }: { onHistoryUpdate: (job: any) => void }) {
  const [url, setUrl] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [format, setFormat] = useState('mp4');
  const [isDownloading, setIsDownloading] = useState(false);

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
        toast.success('Success', { description: 'Recording extracted. Ready for download.' });
      }
    } catch (error: any) {
      const backendError = error.response?.data?.error || error.message;
      toast.error('Extraction failed', { description: backendError });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!metadata?.videoUrl) return;
    setIsDownloading(true);
    
    const downloadUrl = getDownloadUrl(metadata.videoUrl, format, metadata.title, metadata.cookies);
    
    // Create a hidden iframe to trigger the download without navigating away
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    // Clean up iframe after 10 minutes to allow long downloads to finish
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 600000);

    toast.success('Download Started', { description: 'Please check your browser downloads manager!' });
    
    // Add to history
    const jobData = { url: metadata.videoUrl, cookies: metadata.cookies, title: metadata.title, format, date: new Date().toISOString() };
    onHistoryUpdate(jobData);
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
            {isDownloading ? (
              <div className="p-8 text-center space-y-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                <h3 className="text-xl font-medium text-white">Download in Progress</h3>
                <p className="text-sm text-zinc-400">
                  Your file is being generated and streamed directly to your browser. 
                  <br /><br />
                  <strong className="text-zinc-200">Please check your browser's native download manager (top right or bottom of your screen) for progress.</strong>
                </p>
                <Button variant="outline" onClick={() => { setMetadata(null); setIsDownloading(false); setUrl(''); }} className="w-full mt-4">
                  Download Another Video
                </Button>
              </div>
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
                
                <Button onClick={handleDownload} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Download File
                </Button>
                
                <Button variant="ghost" onClick={() => { setMetadata(null); }} className="w-full">
                  Start Over
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
