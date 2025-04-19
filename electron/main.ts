import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  dialog,
  Menu,
  MenuItemConstructorOptions,
} from "electron";
import { join } from "path";
import { existsSync } from "fs";
import { spawn, execSync } from "child_process";
import { PluginManager, setupPluginIpcHandlers } from "./plugin-manager";

// Create a minimal application menu to enable standard keyboard shortcuts
const template: MenuItemConstructorOptions[] = [
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
];

// Set the menu but make it invisible on Windows/Linux (Mac always shows menu)
if (process.platform !== "darwin") {
  // Create invisible menu that provides keyboard shortcuts
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
} else {
  // On macOS, set the application menu with standard shortcuts
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let mainWindow: BrowserWindow | null = null;
let nmapInstallationChecked = false;
let isNmapAvailable = false;

// Function to check if nmap is installed - deferred until needed
function checkNmapInstallation(): Promise<boolean> {
  if (nmapInstallationChecked) {
    return Promise.resolve(isNmapAvailable);
  }

  return new Promise((resolve) => {
    try {
      if (process.platform === "win32") {
        // Windows paths check
        const possiblePaths = [
          "C:\\Program Files (x86)\\Nmap\\nmap.exe",
          "C:\\Program Files\\Nmap\\nmap.exe",
          process.env.PROGRAMFILES + "\\Nmap\\nmap.exe",
          process.env["PROGRAMFILES(X86)"] + "\\Nmap\\nmap.exe",
        ];

        for (const path of possiblePaths) {
          if (existsSync(path)) {
            nmapInstallationChecked = true;
            isNmapAvailable = true;
            resolve(true);
            return;
          }
        }

        try {
          execSync("where nmap");
          nmapInstallationChecked = true;
          isNmapAvailable = true;
          resolve(true);
        } catch {
          nmapInstallationChecked = true;
          isNmapAvailable = false;
          resolve(false);
        }
      } else {
        // macOS/Linux paths check
        const possiblePaths = [
          "/usr/local/bin/nmap",
          "/opt/homebrew/bin/nmap",
          "/usr/bin/nmap",
        ];

        for (const path of possiblePaths) {
          if (existsSync(path)) {
            nmapInstallationChecked = true;
            isNmapAvailable = true;
            resolve(true);
            return;
          }
        }

        try {
          execSync("which nmap");
          nmapInstallationChecked = true;
          isNmapAvailable = true;
          resolve(true);
        } catch {
          nmapInstallationChecked = true;
          isNmapAvailable = false;
          resolve(false);
        }
      }
    } catch (err) {
      console.error("Error checking nmap:", err);
      nmapInstallationChecked = true;
      isNmapAvailable = false;
      resolve(false);
    }
  });
}

// Create window with optimized initialization
function createWindow() {
  // Use the same instance if it exists
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false, // Don't show until ready-to-show for better UX
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Use the ready-to-show event to ensure window only appears when fully ready
  // This avoids a white flash and provides better UX
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Load the app - different approaches for dev vs production
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  // Clean up resources when window is closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle events - optimized to defer operations
app.whenReady().then(() => {
  createWindow();

  // Initialize the plugin system
  setupPluginIpcHandlers();

  // Load initial scripts
  const pluginManager = PluginManager.getInstance();
  pluginManager.loadScripts();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

interface ScanResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Function to get nmap executable path
function getNmapPath(): string {
  if (process.platform === "win32") {
    const possiblePaths = [
      "C:\\Program Files (x86)\\Nmap\\nmap.exe",
      "C:\\Program Files\\Nmap\\nmap.exe",
      process.env.PROGRAMFILES + "\\Nmap\\nmap.exe",
      process.env["PROGRAMFILES(X86)"] + "\\Nmap\\nmap.exe",
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    try {
      return execSync("where nmap").toString().trim();
    } catch {
      return "nmap"; // fallback
    }
  } else if (process.platform === "darwin" || process.platform === "linux") {
    const possiblePaths = [
      "/usr/local/bin/nmap",
      "/opt/homebrew/bin/nmap",
      "/usr/bin/nmap",
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    try {
      return execSync("which nmap").toString().trim();
    } catch {
      return "nmap"; // fallback
    }
  }

  return "nmap"; // default fallback
}

// Handle Nmap scan requests
ipcMain.handle(
  "run-nmap-scan",
  async (_, target: string, parameters: string[]) => {
    return new Promise((resolve) => {
      checkNmapInstallation().then((nmapInstalled) => {
        if (!nmapInstalled) {
          const errorMessage =
            process.platform === "win32"
              ? "Nmap is not installed on your system. Please install Nmap from https://nmap.org/download.html"
              : "Nmap is not installed on your system. Please install nmap to use this application.";

          dialog.showErrorBox("Nmap Not Found", errorMessage);

          resolve({
            success: false,
            error: errorMessage,
          });
          return;
        }

        const nmapPath = getNmapPath();

        // Process parameters to handle script paths
        const processedParams = parameters.map((param) => {
          // Check if this is a script parameter
          if (param.startsWith("--script=") && !param.includes("/")) {
            const pluginManager = PluginManager.getInstance();
            const scripts = pluginManager.loadScripts();
            const scriptMap = new Map(scripts.map((s) => [s.name, s.path]));

            // Replace script names with full paths if they're custom scripts
            const scriptNames = param.substring("--script=".length).split(",");
            const scriptPaths = scriptNames.map((name) =>
              scriptMap.has(name) ? scriptMap.get(name) : name
            );

            return `--script=${scriptPaths.join(",")}`;
          }
          return param;
        });

        const args = [...processedParams, target];

        const nmap = spawn(nmapPath, args);
        let output = "";
        let error = "";

        nmap.stdout.on("data", (data: Buffer) => {
          output += data.toString();
        });

        nmap.stderr.on("data", (data: Buffer) => {
          error += data.toString();
        });

        nmap.on("close", (code: number | null) => {
          if (code === 0) {
            resolve({ success: true, output });
          } else {
            // Check for root privilege errors
            if (
              error.includes("requires root privileges") ||
              error.includes("Permission denied")
            ) {
              const rootErrorMessage =
                process.platform === "darwin" || process.platform === "linux"
                  ? "This scan requires root privileges. On macOS/Linux, you can:\n\n" +
                    "1. Run the application with sudo\n" +
                    "2. Use alternative scan options that don't require root\n" +
                    "3. Configure Nmap capabilities: sudo setcap cap_net_raw,cap_net_admin,cap_net_bind_service+eip $(which nmap)"
                  : "This scan requires administrator privileges. Please run the application as administrator.";

              resolve({
                success: false,
                error: rootErrorMessage,
              });
            } else {
              resolve({ success: false, error: error || "Scan failed" });
            }
          }
        });

        nmap.on("error", (err: Error) => {
          resolve({
            success: false,
            error: `Failed to start nmap: ${err.message}`,
          });
        });
      });
    });
  }
);

// Add file dialog handler for script selection
ipcMain.handle("open-file-dialog", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Nmap Script Files", extensions: ["nse"] },
      { name: "All Files", extensions: ["*"] },
    ],
    title: "Select Nmap Script File",
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});
