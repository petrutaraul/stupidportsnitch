import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

interface NmapScript {
  name: string;
  path: string;
  description?: string;
  isCustom: boolean;
}

interface ScriptSelectorProps {
  onScriptsSelected: (scriptNames: string[]) => void;
  disabled?: boolean;
}

export function ScriptSelector({
  onScriptsSelected,
  disabled = false,
}: ScriptSelectorProps) {
  const [scripts, setScripts] = useState<NmapScript[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available scripts when component mounts
  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    setError(null);
    try {
      const scriptList = await window.electron.ipcRenderer.invoke(
        "get-scripts"
      );
      setScripts(scriptList);
    } catch (err) {
      console.error("Failed to load scripts:", err);
      setError("Failed to load custom scripts");
    } finally {
      setLoading(false);
    }
  };

  const handleScriptToggle = (scriptName: string, checked: boolean) => {
    const newSelectedScripts = new Set(selectedScripts);

    if (checked) {
      newSelectedScripts.add(scriptName);
    } else {
      newSelectedScripts.delete(scriptName);
    }

    setSelectedScripts(newSelectedScripts);

    // Notify parent component about the selected scripts
    const scriptArray = Array.from(newSelectedScripts);
    onScriptsSelected(scriptArray);
  };

  if (loading) {
    return (
      <div className="text-center py-2">
        <span className="animate-spin inline-block h-4 w-4 border-2 border-t-transparent border-blue-600 rounded-full"></span>
        <span className="ml-2 text-sm text-gray-500">Loading scripts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 py-2">
        {error}
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={loadScripts}
          disabled={disabled}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        No custom scripts available. Add scripts in the Plugins tab.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Custom Scripts</Label>
      <div className="grid gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
        {scripts.map((script) => (
          <div key={script.name} className="flex items-center space-x-2">
            <Checkbox
              id={`script-${script.name}`}
              checked={selectedScripts.has(script.name)}
              onCheckedChange={(checked) =>
                handleScriptToggle(script.name, checked === true)
              }
              disabled={disabled}
            />
            <div>
              <Label
                htmlFor={`script-${script.name}`}
                className="text-sm font-medium cursor-pointer"
              >
                {script.name}
              </Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
