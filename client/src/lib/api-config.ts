// API configuration for web and mobile platforms
// On iOS/Android, this should point to a deployed backend server
// On web (dev), it points to localhost

export const API_URL = (() => {
  // Check if running in a browser (web or mobile)
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  // For now, use localhost for development
  // In production, set VITE_API_URL environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default to localhost for dev
  return 'http://localhost:3000';
})();
