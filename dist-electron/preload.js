"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
        invoke: (channel, ...args) => {
            // Whitelist channels
            const validChannels = [
                "run-nmap-scan",
                "get-scripts",
                "add-script",
                "remove-script",
                "open-file-dialog",
                "read-script-content",
                // Allow abort-nmap-scan channel
                "abort-nmap-scan",
            ];
            if (validChannels.includes(channel)) {
                return electron_1.ipcRenderer.invoke(channel, ...args);
            }
            throw new Error(`Unauthorized IPC channel: ${channel}`);
        },
    },
});
