import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SaveIcon, BookmarkIcon, Tag as TagIcon } from "lucide-react";
import { ParsedScanResult } from "../lib/parse-nmap-output";
import { saveScanToHistory, getAllTags } from "../lib/scan-history";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import HtmlExportTemplate from "./HtmlExportTemplate";
import ReactDOMServer from "react-dom/server";

interface ExportResultsProps {
  parsedResults: ParsedScanResult;
  rawOutput: string;
  scanTarget: string;
  scanParameters?: string[];
}

export function ExportResults({
  parsedResults,
  rawOutput,
  scanTarget,
  scanParameters = [],
}: ExportResultsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const formatTimestamp = () => {
    const date = new Date();
    return date
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .split("Z")[0];
  };

  const generateFileName = (format: string) => {
    const timestamp = formatTimestamp();
    const targetName = scanTarget.replace(/[^a-zA-Z0-9]/g, "-");
    return `stupid-port-snitch-scan_${targetName}_${timestamp}.${format}`;
  };

  const exportJSON = async () => {
    try {
      setIsExporting(true);

      // Create JSON content
      const jsonContent = JSON.stringify(
        {
          appInfo: {
            name: "Stupid Port Snitch",
            description: "A simple, modern UI for Nmap scanning",
            version: "1.0.0",
            copyright: `© ${new Date().getFullYear()} Raul Carlos Petru Petruța`,
            website: "https://buymeacoffee.com/raulpetruta",
          },
          scanInfo: parsedResults.scanInfo || {},
          target: scanTarget,
          timestamp: new Date().toISOString(),
          hosts: parsedResults.hosts,
          summary: {
            totalHosts: parsedResults.hosts.length,
            totalOpenPorts: parsedResults.hosts.reduce(
              (sum, host) =>
                sum + host.ports.filter((p) => p.state === "open").length,
              0
            ),
          },
        },
        null,
        2
      );

      const filename = generateFileName("json");
      saveFile(jsonContent, filename, "application/json");
    } finally {
      setIsExporting(false);
    }
  };

  const exportTXT = async () => {
    try {
      setIsExporting(true);

      // Create TXT content
      let txtContent = `=================================================\n`;
      txtContent += `            STUPID PORT SNITCH SCAN RESULTS\n`;
      txtContent += `=================================================\n`;
      txtContent += `Scan powered by Stupid Port Snitch - A simple, modern UI for Nmap scanning\n`;
      txtContent += `© ${new Date().getFullYear()} Raul Carlos Petru Petruța | https://buymeacoffee.com/raulpetruta\n\n`;
      txtContent += `Target: ${scanTarget}\n`;
      txtContent += `Timestamp: ${new Date().toLocaleString()}\n`;

      if (parsedResults.scanInfo) {
        txtContent += `\nSCAN INFO:\n`;
        if (parsedResults.scanInfo.startTime)
          txtContent += `Start time: ${parsedResults.scanInfo.startTime}\n`;
        if (parsedResults.scanInfo.completedTime)
          txtContent += `Completed time: ${parsedResults.scanInfo.completedTime}\n`;
        if (parsedResults.scanInfo.duration)
          txtContent += `Duration: ${parsedResults.scanInfo.duration}\n`;
      }

      txtContent += `\nSUMMARY:\n`;
      txtContent += `Total hosts: ${parsedResults.hosts.length}\n`;
      txtContent += `Total open ports: ${parsedResults.hosts.reduce(
        (sum, host) =>
          sum + host.ports.filter((p) => p.state === "open").length,
        0
      )}\n\n`;

      parsedResults.hosts.forEach((host) => {
        txtContent += `HOST: ${host.ip}${
          host.hostname ? ` (${host.hostname})` : ""
        }\n`;
        if (host.os) txtContent += `OS: ${host.os}\n`;
        txtContent += `Open ports: ${
          host.ports.filter((p) => p.state === "open").length
        }\n\n`;

        if (host.ports.length > 0) {
          txtContent += `PORT\tSTATE\tSERVICE\tVERSION\n`;
          host.ports.forEach((port) => {
            txtContent += `${port.number}/${port.protocol}\t${port.state}\t${
              port.service || "-"
            }\t${port.version || "-"}\n`;
          });
        }
        txtContent += `\n`;
      });

      // Add the raw scan output at the end
      txtContent += `\nRAW SCAN OUTPUT:\n${rawOutput}\n`;

      const filename = generateFileName("txt");
      saveFile(txtContent, filename, "text/plain");
    } finally {
      setIsExporting(false);
    }
  };

  const exportHTML = async () => {
    try {
      setIsExporting(true);

      // Use React's renderToString to convert our component to HTML
      const renderedComponent = ReactDOMServer.renderToStaticMarkup(
        <HtmlExportTemplate
          parsedResults={parsedResults}
          rawOutput={rawOutput}
          scanTarget={scanTarget}
          scanParameters={scanParameters}
        />
      );

      // Create a proper HTML document with doctype and required HTML structure
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stupid Port Snitch - Scan Results for ${scanTarget}</title>
</head>
${renderedComponent}
</html>`;

      const filename = generateFileName("html");
      saveFile(htmlContent, filename, "text/html");
    } finally {
      setIsExporting(false);
    }
  };

  const saveFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  };

  // Handle saving scan to history
  const handleSaveToHistory = () => {
    // Load existing tags from history when dialog opens
    setExistingTags(getAllTags());
    setShowSaveDialog(true);
  };

  // Add a tag to the list
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Remove a tag from the list
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Save the scan with tags and notes to history
  const saveScan = () => {
    try {
      saveScanToHistory(
        scanTarget,
        scanParameters,
        parsedResults,
        rawOutput,
        tags,
        notes // This is already correctly passing the notes!
      );

      // Close the dialog and reset tags and notes
      setShowSaveDialog(false);
      setTags([]);
      setNotes("");

      // Show a success message or notification here if needed
    } catch (error) {
      console.error("Failed to save scan to history:", error);
      // Show an error message to the user if needed
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveToHistory}
          disabled={!parsedResults.hosts || parsedResults.hosts.length === 0}
        >
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Save to History
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={
                isExporting ||
                !parsedResults.hosts ||
                parsedResults.hosts.length === 0
              }
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Results"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportJSON}>
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportTXT}>
              Export as TXT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportHTML}>
              Export as HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Save to History Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Scan to History</DialogTitle>
            <DialogDescription>
              Add tags to help organize and find this scan later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Scan Details</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Target:</strong> {scanTarget}
                </p>
                <p>
                  <strong>Parameters:</strong> {scanParameters.join(" ")}
                </p>
                <p>
                  <strong>Hosts:</strong> {parsedResults.hosts.length}
                </p>
                <p>
                  <strong>Open Ports:</strong>{" "}
                  {parsedResults.hosts.reduce(
                    (sum, host) =>
                      sum + host.ports.filter((p) => p.state === "open").length,
                    0
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Add tags
              </label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Enter a tag (e.g. 'home-network', 'client-server')"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button onClick={addTag}>Add</Button>
              </div>

              {/* Existing tags section */}
              {existingTags.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Existing tags (click to add):
                  </p>
                  <ScrollArea className="max-h-20">
                    <div className="flex flex-wrap gap-1">
                      {existingTags
                        .filter((tag) => !tags.includes(tag))
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => {
                              if (!tags.includes(tag)) {
                                setTags([...tags, tag]);
                              }
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <TagIcon className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      aria-label={`Remove ${tag} tag`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No tags added yet
                  </span>
                )}
              </div>
            </div>

            {/* Notes section */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this scan (e.g., purpose, findings, follow-up items)"
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveScan}>Save to History</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
