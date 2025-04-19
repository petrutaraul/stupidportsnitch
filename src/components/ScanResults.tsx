import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { VisualScanResults } from "./VisualScanResults";
import { NetworkMap } from "./NetworkMap";
import { ParsedScanResult, parseNmapOutput } from "../lib/parse-nmap-output";
import { ExportResults } from "./ExportResults";
import "./ScanResults.scss";

interface ScanResultsProps {
  result: string;
  scanTarget?: string;
  scanParameters?: string[];
  isScanning?: boolean; // Add this prop to know when a scan is in progress
}

export function ScanResults({
  result,
  scanTarget = "unknown-target",
  scanParameters = [],
  isScanning = false, // Default to false
}: ScanResultsProps) {
  const [activeTab, setActiveTab] = useState<string>("visual");
  const [parsedResult, setParsedResult] = useState<ParsedScanResult>({
    hosts: [],
  });
  const [loadingDots, setLoadingDots] = useState<string>("");
  const [scanningStage, setScanningStage] = useState<number>(0);
  const [discoveredPorts, setDiscoveredPorts] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);

  // Parse the result when it changes
  useEffect(() => {
    if (result) {
      const parsed = parseNmapOutput(result);
      setParsedResult(parsed);
    }
  }, [result]);

  // Create an animated loading effect for the scanning state
  useEffect(() => {
    if (!isScanning) {
      setScanningStage(0);
      setDiscoveredPorts([]);
      setProgress(0);
      return;
    }

    // Create loading animation for dots
    const dotsInterval = setInterval(() => {
      setLoadingDots((dots) => {
        if (dots.length >= 3) return "";
        return dots + ".";
      });
    }, 500);

    // Create a simulated scan progress effect
    const stageInterval = setInterval(() => {
      setScanningStage((stage) => {
        if (stage >= 4) return stage;
        return stage + 1;
      });
    }, 3000);

    // Add fake discovered ports for animation
    const portsInterval = setInterval(() => {
      if (scanningStage >= 2) {
        const possiblePorts = [
          "22/tcp",
          "80/tcp",
          "443/tcp",
          "3306/tcp",
          "8080/tcp",
          "25/tcp",
          "21/tcp",
        ];
        const randomPort =
          possiblePorts[Math.floor(Math.random() * possiblePorts.length)];
        const randomState = Math.random() > 0.3 ? "open" : "filtered";
        const service =
          randomPort === "22/tcp"
            ? "ssh"
            : randomPort === "80/tcp"
            ? "http"
            : randomPort === "443/tcp"
            ? "https"
            : randomPort === "3306/tcp"
            ? "mysql"
            : randomPort === "21/tcp"
            ? "ftp"
            : randomPort === "25/tcp"
            ? "smtp"
            : "unknown";

        setDiscoveredPorts((prev) => {
          // Don't add if already exists
          if (prev.some((p) => p.includes(randomPort))) return prev;
          // Limit to 5 ports to avoid cluttering
          if (prev.length >= 5) return prev;
          return [...prev, `${randomPort} ${randomState} ${service}`];
        });
      }
    }, 2000);

    // Update progress
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        const newProgress = p + Math.random() * 10;
        return Math.min(newProgress, 99); // Never reach 100% until scan completes
      });
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(stageInterval);
      clearInterval(portsInterval);
      clearInterval(progressInterval);
    };
  }, [isScanning, scanningStage]);

  if (!result && !isScanning) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-3">
        <div></div>
        {!isScanning && result && (
          <ExportResults
            parsedResults={parsedResult}
            rawOutput={result}
            scanTarget={scanTarget}
            scanParameters={scanParameters}
          />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="visual">Visual Results</TabsTrigger>
          <TabsTrigger value="network">Network Map</TabsTrigger>
          <TabsTrigger value="raw">Raw Output</TabsTrigger>
        </TabsList>

        {isScanning ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center">
            <div className="terminal-animation bg-black text-green-500 p-8 rounded-md w-full h-[400px] overflow-hidden font-mono relative">
              <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white px-4 py-1 flex justify-between">
                <span>Terminal</span>
                <span>nmap scan</span>
              </div>

              <div className="scan-line"></div>

              <div className="mt-8 p-2">
                <div className="ascii-art">
                  {scanningStage >= 1 && (
                    <pre>{`
   ███▄    █  ███▄ ▄███▓ ▄▄▄       ██▓███  
   ██ ▀█   █ ▓██▒▀█▀ ██▒▒████▄    ▓██░  ██▒
  ▓██  ▀█ ██▒▓██    ▓██░▒██  ▀█▄  ▓██░ ██▓▒
  ▓██▒  ▐▌██▒▒██    ▒██ ░██▄▄▄▄██ ▒██▄█▓▒ ▒
  ▒██░   ▓██░▒██▒   ░██▒ ▓█   ▓██▒▒██▒ ░  ░
  ░ ▒░   ▒ ▒ ░ ▒░   ░  ░ ▒▒   ▓▒█░▒▓▒░ ░  ░
  ░ ░░   ░ ▒░░  ░      ░  ▒   ▒▒ ░░▒ ░     
     ░   ░ ░ ░      ░     ░   ▒   ░░       
           ░        ░         ░  ░         `}</pre>
                  )}
                </div>

                <p className="typing-effect">
                  $ nmap {scanParameters.join(" ")} {scanTarget}
                </p>

                <p className="mt-4">
                  {scanningStage >= 1
                    ? "Starting Nmap scan..."
                    : "Initializing..."}
                </p>

                {scanningStage >= 1 && (
                  <p className="mt-2">
                    Scanning target {scanTarget} {loadingDots}
                  </p>
                )}

                {scanningStage >= 2 && (
                  <>
                    <p className="mt-2">
                      Scanning {Math.floor(progress)}% complete {loadingDots}
                    </p>
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${Math.floor(progress)}%`,
                          transition: "width 0.5s ease",
                        }}
                      ></div>
                    </div>
                  </>
                )}

                {scanningStage >= 3 && (
                  <div className="mt-4">
                    <p>Ports discovered:</p>
                    {discoveredPorts.map((port, index) => (
                      <p key={index} className="port-found ml-2 mt-1">
                        • {port}
                      </p>
                    ))}
                  </div>
                )}

                {scanningStage >= 4 && (
                  <p className="mt-3">Finalizing scan results{loadingDots}</p>
                )}

                <p className="mt-4 blink-cursor">_</p>
              </div>
            </div>
            <p className="text-center text-muted-foreground mt-4">
              Scanning in progress{loadingDots}
            </p>
          </div>
        ) : (
          <>
            <TabsContent value="visual" className="mt-0">
              <VisualScanResults rawOutput={result} />
            </TabsContent>

            <TabsContent value="network" className="mt-0">
              <NetworkMap hosts={parsedResult.hosts} />
            </TabsContent>

            <TabsContent value="raw" className="mt-0">
              <pre className="p-4 text-sm bg-muted rounded-md overflow-x-auto h-[400px] overflow-y-auto">
                {result}
              </pre>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
