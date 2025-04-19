/// <reference types="vite/client" />

import { NmapScript } from "./lib/plugin-manager";

interface ElectronAPI {
  ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
