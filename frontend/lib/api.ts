import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const extractMetadata = async (url: string, passcode?: string) => {
  const { data } = await axios.post(`${API_URL}/extract`, { url, passcode });
  return data;
};

export const startConversion = async (videoUrl: string, format: string, title?: string, cookies?: string) => {
  const { data } = await axios.post(`${API_URL}/convert`, { videoUrl, format, title, cookies });
  return data;
};

export const getJobStatus = async (jobId: string) => {
  const { data } = await axios.get(`${API_URL}/status/${jobId}`);
  return data;
};

export const getDownloadUrl = (jobId: string) => {
  return `${API_URL}/download/${jobId}`;
};

export const cleanupJob = async (jobId: string) => {
  await axios.delete(`${API_URL}/cleanup/${jobId}`);
};
