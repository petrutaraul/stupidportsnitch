// filepath: /Users/raul/Developer/Projects/nmap-ui/src/components/ScanForm.tsx
import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SelectableCard } from "./ui/selectable-card";
import { scanOptions } from "../constants/scan-options";
import { scanPresets } from "../constants/scan-presets";
import { Upload } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { ScriptSelector } from "./ScriptSelector";

interface ScanFormProps {
  onScan: (targets: string[], selectedParameters: string[]) => Promise<void>;
  isScanning: boolean;
  onStopScan?: () => void; // Add the stop scan prop
}

export function ScanForm({ onScan, isScanning, onStopScan }: ScanFormProps) {
  const [targetInput, setTargetInput] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set()
  );
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showRootWarning, setShowRootWarning] = useState(false);
  const [error, setError] = useState("");
  const [manualParameters, setManualParameters] = useState("");
  const [useMultipleTargets, setUseMultipleTargets] = useState(false);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManuallyEditing, setIsManuallyEditing] = useState(false);

  const handleOptionToggle = (optionId: string) => {
    const newSelectedOptions = new Set(selectedOptions);
    if (newSelectedOptions.has(optionId)) {
      newSelectedOptions.delete(optionId);
    } else {
      newSelectedOptions.add(optionId);
    }
    setSelectedOptions(newSelectedOptions);

    const hasRootOption = Array.from(newSelectedOptions).some(
      (id) => scanOptions.find((opt) => opt.id === id)?.requiresRoot
    );
    setShowRootWarning(hasRootOption);
  };

  const handlePresetSelect = (presetId: string) => {
    // If the same preset is clicked, deselect it
    if (selectedPreset === presetId) {
      setSelectedPreset(null);
      setManualParameters("");
      setSelectedOptions(new Set());
      setShowRootWarning(false);
      return;
    }

    // Select the new preset
    setSelectedPreset(presetId);

    // Find the preset
    const preset = scanPresets.find((p) => p.id === presetId);
    if (!preset) return;

    // Use the parameter property from the preset
    const presetParams = preset.parameter;

    // Set manual parameters to the preset parameters
    setManualParameters(presetParams);

    // Make sure to apply this update on the next tick to ensure it takes effect
    setTimeout(() => {
      const input = document.getElementById(
        "scanParameters"
      ) as HTMLInputElement;
      if (input) {
        input.value = presetParams;
      }
    }, 0);

    // Clear individual option selections
    setSelectedOptions(new Set());

    // Set root warning if needed
    setShowRootWarning(!!preset.requiresRoot);

    // Set isManuallyEditing to false since we're applying a preset
    setIsManuallyEditing(false);
  };

  const parseTargets = (input: string): string[] => {
    return input
      .split(/[\n,]/) // Split by newline or comma
      .map((target) => target.trim())
      .filter((target) => target !== "");
  };

  const handleSubmit = async () => {
    let targetsToScan: string[] = [];

    if (useMultipleTargets) {
      // Use the parsed targets list
      targetsToScan = targets;
    } else {
      // Use single target
      targetsToScan = [targetInput];
    }

    if (targetsToScan.length === 0) {
      setError("Please enter at least one target");
      return;
    }

    setError("");

    let parameters: string[];

    // If using a preset, get its parameters
    if (selectedPreset) {
      const preset = scanPresets.find((p) => p.id === selectedPreset);
      if (preset) {
        // Get parameters from preset
        const presetParams = preset.parameter;
        parameters = presetParams.split(" ").filter((p) => p.trim() !== "");
      } else {
        parameters = [];
      }
    }
    // If we have card selections, use them
    else if (selectedOptions.size > 0) {
      parameters = Array.from(selectedOptions)
        .map((id) => scanOptions.find((opt) => opt.id === id)?.parameter)
        .filter((param): param is string => param !== undefined);
    }
    // Otherwise use the manual parameters field
    else if (manualParameters.trim()) {
      parameters = manualParameters.split(" ").filter((p) => p.trim() !== "");
    }
    // Fallback to empty array if neither is available
    else {
      parameters = [];
    }

    // Add script parameters if any scripts are selected
    if (selectedScripts.length > 0) {
      // Add --script parameter with comma-separated script names
      parameters.push(`--script=${selectedScripts.join(",")}`);
    }

    await onScan(targetsToScan, parameters);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const fileTargets = parseTargets(content);
      setTargets(fileTargets);
    };
    reader.readAsText(file);
  };

  // Update manual parameters field when selected options change, but only if not manually editing
  useEffect(() => {
    // Skip updating the manual field if the user is currently typing in it or a preset is selected
    if (!isManuallyEditing && !selectedPreset) {
      const parameters = Array.from(selectedOptions)
        .map((id) => scanOptions.find((opt) => opt.id === id)?.parameter)
        .filter((param): param is string => param !== undefined);

      setManualParameters(parameters.join(" "));
    }
  }, [selectedOptions, isManuallyEditing, selectedPreset]);

  // Parse manual parameters and update selected options
  const handleManualParametersChange = (value: string) => {
    // Set flag to indicate we're manually editing
    setIsManuallyEditing(true);
    setManualParameters(value);

    // Only update card selections if there's actual content
    if (value.trim()) {
      // Extract parameters (assuming they're space-separated and start with -)
      const paramArray = value
        .split(" ")
        .filter((param) => param.startsWith("-"));

      // Map parameters back to option IDs and update selected options
      const newSelectedOptions = new Set<string>();

      scanOptions.forEach((option) => {
        if (paramArray.includes(option.parameter)) {
          newSelectedOptions.add(option.id);
        }
      });

      setSelectedOptions(newSelectedOptions);

      // Update root warning
      const hasRootOption = Array.from(newSelectedOptions).some(
        (id) => scanOptions.find((opt) => opt.id === id)?.requiresRoot
      );
      setShowRootWarning(hasRootOption);
    } else {
      // Clear selections if the field is empty
      setSelectedOptions(new Set());
      setShowRootWarning(false);
    }
  };

  // Handle script selection
  const handleScriptsSelected = (scriptNames: string[]) => {
    setSelectedScripts(scriptNames);
  };

  // Update targets when input changes in multiple targets mode
  useEffect(() => {
    if (useMultipleTargets) {
      setTargets(parseTargets(targetInput));
    }
  }, [targetInput, useMultipleTargets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          id="multipleTargets"
          checked={useMultipleTargets}
          onCheckedChange={setUseMultipleTargets}
        />
        <Label htmlFor="multipleTargets">Scan multiple targets</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target">
          {useMultipleTargets
            ? "Targets (one per line or comma-separated)"
            : "Target"}
        </Label>
        {useMultipleTargets ? (
          <div className="space-y-2">
            <Textarea
              id="targets"
              value={targetInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setTargetInput(e.target.value)
              }
              placeholder="Enter IP addresses or hostnames (one per line or comma-separated)"
              className="min-h-[100px]"
            />
            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import from file
              </Button>
              <div className="text-sm text-muted-foreground">
                {targets.length > 0
                  ? `${targets.length} target${
                      targets.length !== 1 ? "s" : ""
                    } loaded`
                  : "No targets loaded"}
              </div>
            </div>
          </div>
        ) : (
          <Input
            id="target"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Enter an IP address or hostname"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="presets">Scan Presets</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {scanPresets.map((preset) => (
            <SelectableCard
              key={preset.id}
              title={`${preset.emoji} ${preset.label}`}
              description={preset.description}
              selected={selectedPreset === preset.id}
              onSelect={() => handlePresetSelect(preset.id)}
              disabled={isScanning}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="options">Scan Options</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {scanOptions.map((option) => (
            <SelectableCard
              key={option.id}
              title={option.label}
              description={option.description}
              selected={selectedOptions.has(option.id)}
              onSelect={() => handleOptionToggle(option.id)}
              disabled={isScanning || !!selectedPreset}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scanParameters">
          Manual Parameters{" "}
          <span className="text-xs text-muted-foreground">
            (advanced users only)
          </span>
        </Label>
        <Input
          id="scanParameters"
          value={manualParameters}
          onChange={(e) => handleManualParametersChange(e.target.value)}
          placeholder="Enter Nmap parameters manually"
          disabled={isScanning}
        />
      </div>

      {/* Custom Scripts Section */}
      <ScriptSelector
        onScriptsSelected={handleScriptsSelected}
        disabled={isScanning}
      />

      {showRootWarning && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-700 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Some selected options require administrator/root privileges
          </p>
        </div>
      )}

      {/* Show error message if exists */}
      {error && (
        <div className="p-4 border border-red-300 bg-red-50 dark:bg-red-900/30 dark:border-red-700 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">⚠️ {error}</p>
        </div>
      )}

      <div className="flex gap-2 w-full">
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isScanning || (!targetInput && targets.length === 0)}
        >
          {isScanning ? "Scanning..." : "Start Scan"}
        </Button>

        {isScanning && onStopScan && (
          <Button
            onClick={onStopScan}
            variant="destructive"
            className="w-[120px]"
          >
            Stop Scan
          </Button>
        )}
      </div>
    </div>
  );
}
