/**
 * Tauri API Utilities
 * 
 * Provides native functionality when running in Tauri desktop app
 * Falls back gracefully when running in browser
 * 
 * NOTE: Install @tauri-apps/api when setting up Tauri:
 * npm install @tauri-apps/api
 * 
 * Optimized for low memory footprint overlay mode
 */

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: {
      window: {
        appWindow: {
          setAlwaysOnTop: (onTop: boolean) => Promise<void>;
          minimize: () => Promise<void>;
          toggleMaximize: () => Promise<void>;
          close: () => Promise<void>;
          setSize: (size: { type: string; width: number; height: number }) => Promise<void>;
          setPosition: (pos: { type: string; x: number; y: number }) => Promise<void>;
          startDragging: () => Promise<void>;
          setDecorations: (decorations: boolean) => Promise<void>;
          center: () => Promise<void>;
        };
        LogicalSize: new (width: number, height: number) => { type: string; width: number; height: number };
        LogicalPosition: new (x: number, y: number) => { type: string; x: number; y: number };
      };
      notification: {
        isPermissionGranted: () => Promise<boolean>;
        requestPermission: () => Promise<string>;
        sendNotification: (options: { title: string; body: string }) => void;
      };
      shell: {
        open: (url: string) => Promise<void>;
      };
      fs: {
        createDir: (path: string, options: { dir: number; recursive: boolean }) => Promise<void>;
        writeTextFile: (path: string, content: string, options: { dir: number }) => Promise<void>;
        readTextFile: (path: string, options: { dir: number }) => Promise<string>;
        BaseDirectory: { AppData: number };
      };
    };
  }
}

// Check if running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window && window.__TAURI__ !== undefined;
};

// Get Tauri APIs safely
const getTauriWindow = () => {
  if (!isTauri()) return null;
  return window.__TAURI__?.window ?? null;
};

const getTauriNotification = () => {
  if (!isTauri()) return null;
  return window.__TAURI__?.notification ?? null;
};

const getTauriShell = () => {
  if (!isTauri()) return null;
  return window.__TAURI__?.shell ?? null;
};

const getTauriFs = () => {
  if (!isTauri()) return null;
  return window.__TAURI__?.fs ?? null;
};

// Window controls
export const setAlwaysOnTop = async (onTop: boolean): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  await windowApi.appWindow.setAlwaysOnTop(onTop);
};

export const minimizeWindow = async (): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  await windowApi.appWindow.minimize();
};

export const maximizeWindow = async (): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  await windowApi.appWindow.toggleMaximize();
};

export const closeWindow = async (): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  await windowApi.appWindow.close();
};

export const setWindowSize = async (width: number, height: number): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  const size = new windowApi.LogicalSize(width, height);
  await windowApi.appWindow.setSize(size);
};

export const setWindowPosition = async (x: number, y: number): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  const pos = new windowApi.LogicalPosition(x, y);
  await windowApi.appWindow.setPosition(pos);
};

export const startDragging = async (): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  await windowApi.appWindow.startDragging();
};

// Native notifications (more efficient than browser API)
export const sendNativeNotification = async (
  title: string, 
  body: string
): Promise<void> => {
  const notificationApi = getTauriNotification();
  
  if (!notificationApi) {
    // Fallback to browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/pwa-192x192.png' });
    }
    return;
  }
  
  let permitted = await notificationApi.isPermissionGranted();
  if (!permitted) {
    const permission = await notificationApi.requestPermission();
    permitted = permission === 'granted';
  }
  
  if (permitted) {
    notificationApi.sendNotification({ title, body });
  }
};

// Open external URL in default browser
export const openExternal = async (url: string): Promise<void> => {
  const shellApi = getTauriShell();
  
  if (!shellApi) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  
  await shellApi.open(url);
};

// File system operations with fallback to localStorage
export const saveToAppData = async (
  filename: string, 
  content: string
): Promise<void> => {
  const fsApi = getTauriFs();
  
  if (!fsApi) {
    localStorage.setItem(`aura-${filename}`, content);
    return;
  }
  
  // Ensure directory exists
  try {
    await fsApi.createDir('', { dir: fsApi.BaseDirectory.AppData, recursive: true });
  } catch {
    // Directory might already exist
  }
  
  await fsApi.writeTextFile(filename, content, { dir: fsApi.BaseDirectory.AppData });
};

export const loadFromAppData = async (filename: string): Promise<string | null> => {
  const fsApi = getTauriFs();
  
  if (!fsApi) {
    return localStorage.getItem(`aura-${filename}`);
  }
  
  try {
    return await fsApi.readTextFile(filename, { dir: fsApi.BaseDirectory.AppData });
  } catch {
    return null;
  }
};

// Overlay mode presets
export const setOverlayMode = async (enabled: boolean): Promise<void> => {
  const windowApi = getTauriWindow();
  if (!windowApi) return;
  
  if (enabled) {
    // Compact overlay mode for gaming
    await windowApi.appWindow.setAlwaysOnTop(true);
    await windowApi.appWindow.setDecorations(false);
    await setWindowSize(400, 300);
  } else {
    // Full window mode
    await windowApi.appWindow.setAlwaysOnTop(false);
    await windowApi.appWindow.setDecorations(true);
    await setWindowSize(1200, 800);
    await windowApi.appWindow.center();
  }
};
