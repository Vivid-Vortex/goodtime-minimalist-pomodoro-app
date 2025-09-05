import { useSessionStore } from '../stores/sessionStore';

export const downloadJsonFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportSessionsAsJson = async () => {
  const sessionStore = useSessionStore.getState();
  const jsonData = await sessionStore.exportSessions();
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `goodtime_sessions_${timestamp}.json`;
  
  downloadJsonFile(filename, jsonData);
};

export const formatDurationForExport = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};