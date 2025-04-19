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

    // Add default scripts
    this.addDefaultScripts();
  }

  // Create and add default scripts for users to try
  private addDefaultScripts(): void {
    try {
      const defaultScripts = [
        {
          name: "http-title",
          content: `description = [[
This is a default script included for testing. It retrieves the HTML title of a web page.
It can be used to identify what web server software is running on a target machine.
]]

author = "Demo Script for Stupid Port Snitch"
categories = {"discovery", "safe"}

portrule = function(host, port)
  return port.protocol == "tcp" and port.state == "open" and port.service == "http"
end

action = function(host, port)
  local result = "This is a demo script. In a real NSE script, this would connect to the HTTP server and extract the title."
  return result
end
`,
        },
        {
          name: "ssh-auth-methods",
          content: `description = [[
This is a default script included for testing. It checks what authentication methods an SSH server supports.
]]

author = "Demo Script for Stupid Port Snitch"
categories = {"discovery", "safe"}

portrule = function(host, port)
  return port.protocol == "tcp" and port.state == "open" and port.service == "ssh"
end

action = function(host, port)
  local result = "This is a demo script. In a real NSE script, this would check what authentication methods the SSH server offers (password, publickey, etc)."
  return result
end
`,
        },
      ];

      defaultScripts.forEach((script) => {
        const scriptPath = path.join(
          this.scriptsDirectory,
          `${script.name}.nse`
        );

        // Only create if it doesn't exist already
        if (!fs.existsSync(scriptPath)) {
          fs.writeFileSync(scriptPath, script.content);
        }
      });
    } catch (error) {
      console.error("Failed to create default scripts:", error);
    }
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

    // Default script names - used to identify which scripts are defaults
    const defaultScriptNames = ["http-title", "ssh-auth-methods"];

    // Load custom scripts from user directory
    if (fs.existsSync(this.scriptsDirectory)) {
      const files = fs.readdirSync(this.scriptsDirectory);
      files.forEach((file) => {
        if (file.endsWith(".nse")) {
          const scriptPath = path.join(this.scriptsDirectory, file);
          const scriptName = path.basename(file, ".nse");
          const description = this.extractScriptDescription(scriptPath);
          const isDefaultScript = defaultScriptNames.includes(scriptName);

          const script: NmapScript = {
            name: scriptName,
            path: scriptPath,
            description: isDefaultScript
              ? `[DEFAULT SCRIPT] ${
                  description || "Sample script included for testing"
                }`
              : description,
            isCustom: true,
          };

          this.scripts.set(scriptName, script);
          scripts.push(script);
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

    // Add handler to read script content
    ipcMain.handle("read-script-content", async (_, scriptPath: string) => {
      try {
        return fs.readFileSync(scriptPath, "utf8");
      } catch (error) {
        console.error("Error reading script content:", error);
        throw error;
      }
    });
  }
}
