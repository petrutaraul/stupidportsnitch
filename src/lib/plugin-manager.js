"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
exports.setupPluginIpcHandlers = setupPluginIpcHandlers;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_2 = require("electron");
class PluginManager {
    constructor() {
        this.scripts = new Map();
        // Get the app path for built-in scripts
        const appPath = electron_1.app ? electron_1.app.getAppPath() : process.cwd();
        // Path for user custom scripts
        this.scriptsDirectory = path_1.default.join(appPath, "resources", "scripts");
        // Path for built-in nmap scripts reference
        this.builtInScriptsDirectory = path_1.default.join(appPath, "resources", "nmap", "scripts");
        // Ensure the scripts directory exists
        this.ensureDirectoryExists(this.scriptsDirectory);
    }
    static getInstance() {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }
    ensureDirectoryExists(directory) {
        if (!fs_1.default.existsSync(directory)) {
            fs_1.default.mkdirSync(directory, { recursive: true });
        }
    }
    loadScripts() {
        this.scripts.clear();
        const scripts = [];
        // Load custom scripts from user directory
        if (fs_1.default.existsSync(this.scriptsDirectory)) {
            const files = fs_1.default.readdirSync(this.scriptsDirectory);
            files.forEach((file) => {
                if (file.endsWith(".nse")) {
                    const scriptPath = path_1.default.join(this.scriptsDirectory, file);
                    const scriptName = path_1.default.basename(file, ".nse");
                    const description = this.extractScriptDescription(scriptPath);
                    const script = {
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
        return scripts;
    }
    extractScriptDescription(scriptPath) {
        try {
            // Read the first 50 lines of the script to find description
            const content = fs_1.default
                .readFileSync(scriptPath, "utf8")
                .split("\n")
                .slice(0, 50)
                .join("\n");
            // Most NSE scripts have a description in a comment or in a description variable
            const descriptionMatch = content.match(/description\s*=\s*[["']([^"']+)['"]\]?/) ||
                content.match(/--\s*([^\n]+)/);
            if (descriptionMatch && descriptionMatch[1]) {
                return descriptionMatch[1].trim();
            }
            return undefined;
        }
        catch (error) {
            console.error(`Error extracting description from ${scriptPath}:`, error);
            return undefined;
        }
    }
    // Add a custom script to the scripts directory
    addScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const fileName = path_1.default.basename(scriptPath);
                if (!fileName.endsWith(".nse")) {
                    reject(new Error("Invalid script file. Must be an .nse file."));
                    return;
                }
                const destPath = path_1.default.join(this.scriptsDirectory, fileName);
                // Copy the script to our scripts directory
                fs_1.default.copyFileSync(scriptPath, destPath);
                // Create the script object
                const scriptName = path_1.default.basename(fileName, ".nse");
                const description = this.extractScriptDescription(destPath);
                const script = {
                    name: scriptName,
                    path: destPath,
                    description,
                    isCustom: true,
                };
                this.scripts.set(scriptName, script);
                resolve(script);
            }
            catch (error) {
                console.error("Error adding script:", error);
                reject(error);
            }
        });
    }
    // Remove a custom script
    removeScript(scriptName) {
        return new Promise((resolve, reject) => {
            try {
                const script = this.scripts.get(scriptName);
                if (!script || !script.isCustom) {
                    reject(new Error("Script not found or cannot remove built-in script"));
                    return;
                }
                fs_1.default.unlinkSync(script.path);
                this.scripts.delete(scriptName);
                resolve(true);
            }
            catch (error) {
                console.error("Error removing script:", error);
                reject(error);
            }
        });
    }
    getScripts() {
        return Array.from(this.scripts.values());
    }
}
exports.PluginManager = PluginManager;
// Setup IPC handlers for plugin management if running in main process
function setupPluginIpcHandlers() {
    if (electron_2.ipcMain) {
        const pluginManager = PluginManager.getInstance();
        electron_2.ipcMain.handle("get-scripts", async () => {
            return pluginManager.loadScripts();
        });
        electron_2.ipcMain.handle("add-script", async (_, scriptPath) => {
            try {
                return await pluginManager.addScript(scriptPath);
            }
            catch (error) {
                console.error("Error adding script via IPC:", error);
                throw error;
            }
        });
        electron_2.ipcMain.handle("remove-script", async (_, scriptName) => {
            try {
                return await pluginManager.removeScript(scriptName);
            }
            catch (error) {
                console.error("Error removing script via IPC:", error);
                throw error;
            }
        });
    }
}
