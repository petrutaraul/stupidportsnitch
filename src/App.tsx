import { useState, Suspense } from "react";
import "./App.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { ScanForm } from "./components/ScanForm";
import { ScanResults } from "./components/ScanResults";
import { ContactSection } from "./components/ContactSection";
import { ScanHistory } from "./components/ScanHistory";
import { PluginManager } from "./components/PluginManager";

// Import the tab components directly
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
  }
}

interface ScanSession {
  id: string;
  target: string;
  parameters: string[];
  output: string;
  timestamp: Date;
  parsedResults?: any; // Add parsedResults for historical scans
}

// Group scan sessions by batch
interface ScanBatch {
  id: string;
  targets: string[];
  parameters: string[];
  sessions: ScanSession[];
  timestamp: Date;
}

function App() {
  const [scanBatches, setScanBatches] = useState<ScanBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>("");
  const [activeTargetIndex, setActiveTargetIndex] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanAbortController, setCurrentScanAbortController] =
    useState<AbortController | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("scan");

  // Stop the current scan
  const stopScan = async () => {
    if (currentScanAbortController) {
      // Abort the current scan
      currentScanAbortController.abort();
      setCurrentScanAbortController(null);

      // Let the UI know we're no longer scanning
      setIsScanning(false);

      // Optionally display a message that the scan was stopped by the user
      setError("Scan stopped by user");
    }
  };

  const handleScan = async (
    targets: string[],
    selectedParameters: string[]
  ) => {
    setIsScanning(true);
    setError("");

    // Create a new abort controller for this scan
    const abortController = new AbortController();
    setCurrentScanAbortController(abortController);

    // Create a new batch ID
    const batchId = `batch-${Date.now()}`;
    const timestamp = new Date();
    const newSessions: ScanSession[] = [];

    try {
      // Scan each target sequentially
      for (const target of targets) {
        // Check if the scan was aborted
        if (abortController.signal.aborted) {
          break;
        }

        const result = await window.electron.ipcRenderer.invoke(
          "run-nmap-scan",
          target,
          selectedParameters,
          { signal: abortController.signal }
        );

        if (result.success) {
          const newScan: ScanSession = {
            id: `scan-${Date.now()}-${target}`,
            target,
            parameters: selectedParameters,
            output: result.output,
            timestamp: new Date(),
          };

          newSessions.push(newScan);
        } else {
          // If one fails, add it with an error message
          newSessions.push({
            id: `scan-${Date.now()}-${target}-error`,
            target,
            parameters: selectedParameters,
            output: `Error scanning ${target}: ${
              result.error || "Unknown error"
            }`,
            timestamp: new Date(),
          });
        }
      }

      // Create the new batch with all sessions
      const newBatch: ScanBatch = {
        id: batchId,
        targets,
        parameters: selectedParameters,
        sessions: newSessions,
        timestamp,
      };

      setScanBatches((prev) => [...prev, newBatch]);
      setActiveBatchId(batchId);
      setActiveTargetIndex(0);
    } catch (err) {
      setError("Failed to run scan");
    } finally {
      setIsScanning(false);
    }
  };

  // Get the active scan batch (if any)
  const activeBatch = scanBatches.find((batch) => batch.id === activeBatchId);

  // Get the active scan session within the active batch
  const activeSession = activeBatch?.sessions[activeTargetIndex];

  // Format scan batch tab label: "Scan 1 (3 targets)"
  const getBatchLabel = (batch: ScanBatch, index: number) => {
    const targetCount = batch.sessions.length;
    return `Scan ${index + 1} (${targetCount} target${
      targetCount !== 1 ? "s" : ""
    })`;
  };

  // Format target tab label: "192.168.1.1"
  const getTargetLabel = (session: ScanSession) => {
    return session.target;
  };

  // Handle closing a scan batch tab
  const handleCloseBatch = (batchId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent tab selection when clicking the close button

    // Remove the batch from the list
    setScanBatches((prev) => prev.filter((batch) => batch.id !== batchId));

    // If we're removing the active batch, select another one
    if (batchId === activeBatchId) {
      // Find the index of the batch we're removing
      const batchIndex = scanBatches.findIndex((batch) => batch.id === batchId);

      // If there will be batches left after removal
      if (scanBatches.length > 1) {
        // Select the previous batch, or the first one if removing the first batch
        const newIndex = batchIndex > 0 ? batchIndex - 1 : 0;
        const newBatchId =
          scanBatches[newIndex === batchIndex ? newIndex + 1 : newIndex]?.id;
        if (newBatchId) {
          setActiveBatchId(newBatchId);
          setActiveTargetIndex(0);
        }
      } else {
        // If no batches will be left, reset the active batch and target
        setActiveBatchId("");
        setActiveTargetIndex(0);
      }
    }
  };

  // Handler for loading a scan from history
  const handleLoadScanFromHistory = (historyScan: any) => {
    // Create a new batch from the historical scan
    const newBatch: ScanBatch = {
      id: `batch-history-${Date.now()}`,
      targets: [historyScan.target],
      parameters: historyScan.scanParameters,
      sessions: [
        {
          id: `scan-history-${Date.now()}`,
          target: historyScan.target,
          parameters: historyScan.scanParameters,
          output: historyScan.rawOutput,
          timestamp: new Date(),
          // Store the parsed results to enable saving back to history
          parsedResults: historyScan.parsedResults,
        },
      ],
      timestamp: new Date(),
    };

    // Add the batch to our batches
    setScanBatches((prev) => [...prev, newBatch]);

    // Set this as the active batch
    setActiveBatchId(newBatch.id);
    setActiveTargetIndex(0);

    // Switch to the scan tab to show the loaded scan
    setActiveTab("scan");

    // Switch to the scan tab
    setActiveTab("scan");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex justify-center flex-1">
            <img
              src="./icon.png"
              alt="Stupid Port Snitch"
              className="h-24 w-24"
              title="Stupid Port Snitch"
            />
          </div>
          <div className="flex-none">
            <ThemeToggle />
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mx-auto"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scan">Scan</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="plugins">Scripts</TabsTrigger>
              <TabsTrigger value="contact">Support</TabsTrigger>
            </TabsList>

            <TabsContent value="scan">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column: Scan Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Network Scan</CardTitle>
                    <CardDescription>
                      Enter target(s) and select scan options to begin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ScanForm
                      onScan={handleScan}
                      isScanning={isScanning}
                      onStopScan={stopScan}
                    />
                    {error && (
                      <div className="p-4 text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-md">
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Right column: Scan Results */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Scan Results</CardTitle>
                    <CardDescription>
                      View the results of your scans here
                    </CardDescription>
                    {/* Scan batch tabs */}
                    {scanBatches.length > 1 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Select a scan to view its results
                      </p>
                    )}
                    {/* Scan batch tabs */}
                    {scanBatches.length > 0 && (
                      <div className="mt-2 border-b">
                        <Tabs
                          value={activeBatchId}
                          onValueChange={setActiveBatchId}
                          className="w-full"
                        >
                          <TabsList className="flex overflow-x-auto pb-px">
                            {scanBatches.map((batch, index) => (
                              <TabsTrigger
                                key={batch.id}
                                value={batch.id}
                                className="text-xs whitespace-nowrap flex items-center gap-2 pr-1"
                              >
                                <span>{getBatchLabel(batch, index)}</span>
                                <span
                                  onClick={(e) => handleCloseBatch(batch.id, e)}
                                  className="rounded-full h-4 w-4 inline-flex items-center justify-center bg-muted hover:bg-muted-foreground hover:text-background transition-colors cursor-pointer"
                                  aria-label={`Close ${getBatchLabel(
                                    batch,
                                    index
                                  )}`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="10"
                                    height="10"
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
                                </span>
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>
                    )}

                    {/* Individual target tabs */}
                    {activeBatch && activeBatch.sessions.length > 1 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Select a target to view its results
                        </p>
                        <Tabs
                          value={String(activeTargetIndex)}
                          onValueChange={(value) =>
                            setActiveTargetIndex(parseInt(value))
                          }
                          className="w-full"
                        >
                          <TabsList className="flex overflow-x-auto pb-px">
                            {activeBatch.sessions.map((session, index) => (
                              <TabsTrigger
                                key={session.id}
                                value={String(index)}
                                className="text-xs whitespace-nowrap"
                              >
                                {getTargetLabel(session)}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    {scanBatches.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <p>No scan results yet</p>
                        <p className="text-sm mt-2">
                          Start a scan to see results here
                        </p>
                      </div>
                    ) : (
                      <ScanResults
                        result={activeSession?.output || ""}
                        scanTarget={activeSession?.target || "unknown-target"}
                        scanParameters={activeSession?.parameters || []}
                        isScanning={isScanning}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <ScanHistory onLoadScan={handleLoadScanFromHistory} />
            </TabsContent>

            <TabsContent value="plugins">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Nmap Scripts</CardTitle>
                  <CardDescription>
                    Add and manage custom NSE scripts to enhance your scanning
                    capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PluginManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Support the Project</CardTitle>
                  <CardDescription>
                    If you find this tool useful, consider supporting me!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContactSection />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
