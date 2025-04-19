import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Trash2,
  Upload,
  RefreshCw,
  FileText,
  X,
  HelpCircle,
} from "lucide-react";
import { NmapScript } from "../lib/plugin-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "./ui/dialog";

export function PluginManager() {
  const [scripts, setScripts] = useState<NmapScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<NmapScript | null>(null);
  const [scriptContent, setScriptContent] = useState<string>("");
  const [isViewingScript, setIsViewingScript] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load scripts on component mount
  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electron.ipcRenderer.invoke("get-scripts");
      setScripts(result);
    } catch (err) {
      console.error("Error loading scripts:", err);
      setError("Failed to load scripts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddScript = async () => {
    try {
      // Open file dialog to select .nse file
      const filePath = await window.electron.ipcRenderer.invoke(
        "open-file-dialog"
      );
      if (!filePath) return;

      setLoading(true);
      setError(null);

      // Add the script using the plugin manager
      const addedScript = await window.electron.ipcRenderer.invoke(
        "add-script",
        filePath
      );
      if (addedScript) {
        // Refresh script list
        await loadScripts();
      }
    } catch (err: any) {
      console.error("Error adding script:", err);
      setError(err?.message || "Failed to add script");
      setLoading(false);
    }
  };

  const handleRemoveScript = async (scriptName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Remove script
      await window.electron.ipcRenderer.invoke("remove-script", scriptName);

      // Refresh script list
      await loadScripts();
    } catch (err: any) {
      console.error("Error removing script:", err);
      setError(err?.message || "Failed to remove script");
      setLoading(false);
    }
  };

  const handleViewScript = async (script: NmapScript) => {
    try {
      setSelectedScript(script);
      setLoading(true);

      // Read the script content
      const content = await window.electron.ipcRenderer.invoke(
        "read-script-content",
        script.path
      );
      setScriptContent(content);
      setIsViewingScript(true);
    } catch (err) {
      console.error("Error reading script content:", err);
      setError("Failed to read script content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Nmap Scripts</h3>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-1 h-auto"
            onClick={() => setShowHelp(true)}
            title="Help with Scripts"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadScripts}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleAddScript} disabled={loading}>
            <Upload className="h-4 w-4 mr-1" />
            Add Script
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {loading && !isViewingScript ? (
        <div className="text-center py-4">
          <span className="animate-spin inline-block h-6 w-6 border-2 border-t-transparent border-blue-600 rounded-full"></span>
          <p className="mt-2 text-sm text-gray-500">Loading scripts...</p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <p className="text-gray-500">No custom scripts added yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add NSE scripts to enhance your scan capabilities
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {scripts.map((script) => (
            <div key={script.name} className="border rounded-md p-3">
              <div className="flex items-center">
                <div className="flex-1 min-w-0 mr-2">
                  <h4 className="font-medium text-sm truncate">
                    {script.name}
                  </h4>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewScript(script)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    title="View script content"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveScript(script.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete script"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Script Content Dialog */}
      <Dialog open={isViewingScript} onOpenChange={setIsViewingScript}>
        <DialogContent className="sm:max-w-xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span
                className="truncate max-w-[90%]"
                title={selectedScript?.name || ""}
              >
                {selectedScript?.name}
              </span>
              <DialogClose className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogTitle>
            {selectedScript?.description && (
              <DialogDescription className="mt-2 text-sm text-muted-foreground break-words">
                {selectedScript.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="relative mt-4 border rounded-md bg-gray-50 dark:bg-gray-900">
            <pre className="overflow-x-auto p-4 text-sm font-mono text-gray-800 dark:text-gray-200 max-h-[60vh] whitespace-pre-wrap break-all">
              {scriptContent || "Loading script content..."}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <span>How to Use Nmap Scripts</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <p>
              Scripts extend nmap's functionality by performing specialized
              tasks during scans. Here's how to use them:
            </p>

            <div className="space-y-2">
              <h4 className="font-medium">Managing Scripts</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <strong>Add Scripts:</strong> Click "Add Script" to upload any
                  NSE (Nmap Script Engine) file.
                </li>
                <li>
                  <strong>Remove Scripts:</strong> Click the red trash icon next
                  to any script you want to delete.
                </li>
                <li>
                  <strong>View Script Code:</strong> Click the file icon to see
                  the full script content.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Using Scripts in Scans</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <strong>Select Scripts:</strong> When running a scan, choose
                  scripts from the "Custom Scripts" section in the scan form.
                </li>
                <li>
                  <strong>Default Scripts:</strong> Two sample scripts are
                  included by default for testing purposes.
                </li>
                <li>
                  <strong>Script Output:</strong> Results from scripts will
                  appear in your scan results.
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Tip:</p>
              <p>
                You can find many useful NSE scripts in the{" "}
                <a
                  href="https://nmap.org/nsedoc/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  Nmap Script Documentation
                </a>{" "}
                or create your own.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
