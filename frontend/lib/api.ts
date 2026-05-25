import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const extractMetadata = async (url: string, passcode?: string) => {
  const { data } = await axios.post(`${API_URL}/extract`, { url, passcode });
  return data;
};

export const getDownloadUrl = (url: string, format: string, title?: string, cookies?: string) => {
  const params = new URLSearchParams({
    url,
    format,
    title: title || '',
    cookies: cookies || ''
  });
  return `${API_URL}/download?${params.toString()}`;
};
