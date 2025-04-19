import { app } from "electron";
import fs from "fs";
import path from "path";
import { ipcMain } from "electron";

export interface NmapScript {
  name: string;
  path: string;
  description?: string;
  isCustom: boolean;
}

export class PluginManager {
  private static instance: PluginManager;
  private scriptsDirectory: string;
  private builtInScriptsDirectory: string;
  private scripts: Map<string, NmapScript> = new Map();

  private constructor() {
    // Get the app path for built-in scripts
    const appPath = app ? app.getAppPath() : process.cwd();

    // Path for user custom scripts
    this.scriptsDirectory = path.join(appPath, "resources", "scripts");

    // Path for built-in nmap scripts reference
    this.builtInScriptsDirectory = path.join(
      appPath,
      "resources",
      "nmap",
      "scripts"
    );

    // Ensure the scripts directory exists
    this.ensureDirectoryExists(this.scriptsDirectory);
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private ensureDirectoryExists(directory: string): void {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  public loadScripts(): NmapScript[] {
    this.scripts.clear();
    const scripts: NmapScript[] = [];

    // Load custom scripts from user directory
    if (fs.existsSync(this.scriptsDirectory)) {
      const files = fs.readdirSync(this.scriptsDirectory);
      files.forEach((file) => {
        if (file.endsWith(".nse")) {
          const scriptPath = path.join(this.scriptsDirectory, file);
          const scriptName = path.basename(file, ".nse");
          const description = this.extractScriptDescription(scriptPath);

          const script: NmapScript = {
            name: scriptName,
            path: scriptPath,
            description,
            isCustom: true,
          };

          this.scripts.set(scriptName, script);
          scripts.push(script);
        }
      });
    }

    // Load built-in nmap scripts if the directory exists
    if (fs.existsSync(this.builtInScriptsDirectory)) {
      const files = fs.readdirSync(this.builtInScriptsDirectory);
      files.forEach((file) => {
        if (file.endsWith(".nse")) {
          const scriptPath = path.join(this.builtInScriptsDirectory, file);
          const scriptName = path.basename(file, ".nse");

          // Only add if not already added as a custom script
          if (!this.scripts.has(scriptName)) {
            const description = this.extractScriptDescription(scriptPath);

            const script: NmapScript = {
              name: scriptName,
              path: scriptPath,
              description,
              isCustom: false,
            };

            this.scripts.set(scriptName, script);
            scripts.push(script);
          }
        }
      });
    }

    return scripts;
  }

  private extractScriptDescription(scriptPath: string): string | undefined {
    try {
      // Read the first 50 lines of the script to find description
      const content = fs
        .readFileSync(scriptPath, "utf8")
        .split("\n")
        .slice(0, 50)
        .join("\n");

      // Most NSE scripts have a description in a comment or in a description variable
      const descriptionMatch =
        content.match(/description\s*=\s*[["']([^"']+)['"]\]?/) ||
        content.match(/--\s*([^\n]+)/);

      if (descriptionMatch && descriptionMatch[1]) {
        return descriptionMatch[1].trim();
      }

      return undefined;
    } catch (error) {
      console.error(`Error extracting description from ${scriptPath}:`, error);
      return undefined;
    }
  }

  // Add a custom script to the scripts directory
  public addScript(scriptPath: string): Promise<NmapScript | null> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = path.basename(scriptPath);
        if (!fileName.endsWith(".nse")) {
          reject(new Error("Invalid script file. Must be an .nse file."));
          return;
        }

        const destPath = path.join(this.scriptsDirectory, fileName);

        // Copy the script to our scripts directory
        fs.copyFileSync(scriptPath, destPath);

        // Create the script object
        const scriptName = path.basename(fileName, ".nse");
        const description = this.extractScriptDescription(destPath);

        const script: NmapScript = {
          name: scriptName,
          path: destPath,
          description,
          isCustom: true,
        };

        this.scripts.set(scriptName, script);
        resolve(script);
      } catch (error) {
        console.error("Error adding script:", error);
        reject(error);
      }
    });
  }

  // Remove a custom script
  public removeScript(scriptName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const script = this.scripts.get(scriptName);

        if (!script || !script.isCustom) {
          reject(
            new Error("Script not found or cannot remove built-in script")
          );
          return;
        }

        fs.unlinkSync(script.path);
        this.scripts.delete(scriptName);
        resolve(true);
      } catch (error) {
        console.error("Error removing script:", error);
        reject(error);
      }
    });
  }

  public getScripts(): NmapScript[] {
    return Array.from(this.scripts.values());
  }
}

// Setup IPC handlers for plugin management if running in main process
export function setupPluginIpcHandlers() {
  if (ipcMain) {
    const pluginManager = PluginManager.getInstance();

    ipcMain.handle("get-scripts", async () => {
      return pluginManager.loadScripts();
    });

    ipcMain.handle("add-script", async (_, scriptPath: string) => {
      try {
        return await pluginManager.addScript(scriptPath);
      } catch (error) {
        console.error("Error adding script via IPC:", error);
        throw error;
      }
    });

    ipcMain.handle("remove-script", async (_, scriptName: string) => {
      try {
        return await pluginManager.removeScript(scriptName);
      } catch (error) {
        console.error("Error removing script via IPC:", error);
        throw error;
      }
    });
  }
}
