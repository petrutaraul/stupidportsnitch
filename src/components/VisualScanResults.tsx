import { useEffect, useState } from "react";
import {
  Port,
  ParsedScanResult,
  parseNmapOutput,
} from "../lib/parse-nmap-output";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Collapsible, CollapsibleContent } from "./ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Server,
  Clock,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { checkServiceRisk } from "../lib/vulnerabilities";

interface VisualScanResultsProps {
  rawOutput: string;
}

export function VisualScanResults({ rawOutput }: VisualScanResultsProps) {
  const [parsedResult, setParsedResult] = useState<ParsedScanResult>({
    hosts: [],
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (rawOutput) {
      const parsed = parseNmapOutput(rawOutput);
      setParsedResult(parsed);

      // Initialize expanded state for all hosts
      const newExpanded: Record<string, boolean> = {};
      parsed.hosts.forEach((host) => {
        // Keep existing expanded state if available, otherwise set to false
        // (or true for auto-expand if there are 3 or fewer hosts)
        newExpanded[host.ip] =
          expanded[host.ip] !== undefined
            ? expanded[host.ip]
            : parsed.hosts.length <= 3;
      });
      setExpanded(newExpanded);

      // Check for vulnerabilities in service versions
      checkVulnerabilities(parsed);
    }
  }, [rawOutput]);

  // Function to check for vulnerabilities in service versions
  const checkVulnerabilities = async (parsed: ParsedScanResult) => {
    const updatedHosts = [...parsed.hosts];
    const newLoading: Record<string, boolean> = {};

    for (const host of updatedHosts) {
      for (const port of host.ports) {
        if (port.state === "open" && port.service && port.version) {
          const portKey = `${host.ip}-${port.number}-${port.protocol}`;
          newLoading[portKey] = true;
          setLoading({ ...newLoading });

          try {
            const riskInfo = await checkServiceRisk(port.service, port.version);

            if (riskInfo.isVulnerable) {
              port.vulnerabilities = {
                isVulnerable: true,
                highestScore: riskInfo.highestScore,
                vulnerabilityCount: riskInfo.vulnerabilityCount,
                details: riskInfo.vulnerabilities.map((v) => ({
                  id: v.id,
                  description: v.description,
                  cvssScore: v.cvssScore,
                  url: v.url,
                })),
              };
            }
          } catch (error) {
            console.error(
              `Error checking vulnerabilities for ${port.service} ${port.version}:`,
              error
            );
          } finally {
            newLoading[portKey] = false;
            setLoading({ ...newLoading });
          }
        }
      }
    }

    setParsedResult({ ...parsed, hosts: updatedHosts });
  };

  const toggleExpanded = (ip: string) => {
    setExpanded((prev) => ({
      ...prev,
      [ip]: !prev[ip],
    }));
  };

  const getPortStateColor = (state: Port["state"]) => {
    switch (state) {
      case "open":
        return "bg-green-500 text-white";
      case "closed":
        return "bg-red-500 text-white";
      case "filtered":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPortStateIcon = (state: Port["state"]) => {
    switch (state) {
      case "open":
        return "●";
      case "closed":
        return "✕";
      case "filtered":
        return "◌";
      default:
        return "?";
    }
  };

  if (!rawOutput) {
    return null;
  }
  if (parsedResult.hosts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No hosts found in scan results.</p>
            <p className="text-sm mt-2">Try adjusting your scan parameters.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract additional metadata from raw output
  const notShownMatch = rawOutput.match(
    /Not shown: (\d+) (.*) (?:tcp|udp) ports/
  );
  let notShownInfo = null;
  if (notShownMatch) {
    notShownInfo = {
      count: notShownMatch[1],
      state: notShownMatch[2],
    };
  }

  return (
    <div className="space-y-4">
      {(parsedResult.scanInfo || notShownInfo) && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-2">
            <div className="flex flex-wrap gap-4 text-sm">
              {parsedResult.scanInfo?.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {parsedResult.scanInfo.duration}</span>
                </div>
              )}
              {parsedResult.scanInfo?.startTime && (
                <div className="flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  <span>Started: {parsedResult.scanInfo.startTime}</span>
                </div>
              )}
              {notShownInfo && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Not shown in raw data: {notShownInfo.count}{" "}
                    {notShownInfo.state} ports
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {parsedResult.hosts.map((host) => (
        <Card key={host.ip} className="overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleExpanded(host.ip)}
            >
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <CardTitle className="text-base flex items-center gap-2">
                  {host.ip}
                  {host.hostname && (
                    <span className="text-muted-foreground text-sm font-normal">
                      ({host.hostname})
                    </span>
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="ml-2 bg-green-500/10 text-green-600 border-green-600/20"
                >
                  {host.ports.filter((p) => p.state === "open").length} open
                </Badge>
                <Badge
                  variant="outline"
                  className="ml-2 bg-red-500/10 text-red-600 border-red-600/20"
                >
                  {host.ports.filter((p) => p.state === "closed").length} closed
                </Badge>
                {host.ports.filter((p) => p.state === "filtered").length >
                  0 && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-yellow-500/10 text-yellow-600 border-yellow-600/20"
                  >
                    {host.ports.filter((p) => p.state === "filtered").length}{" "}
                    filtered
                  </Badge>
                )}
                {expanded[host.ip] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
            {host.os && <CardDescription>OS: {host.os}</CardDescription>}
          </CardHeader>

          <Collapsible open={expanded[host.ip]}>
            <CollapsibleContent>
              <CardContent className="p-4">
                {host.ports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No port information available
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-3 text-sm font-medium text-muted-foreground">
                      <div>Port</div>
                      <div>State</div>
                      <div>Service</div>
                      <div>MAC Address</div>
                      <div>Vendor</div>
                    </div>
                    <div className="space-y-2">
                      {host.ports.map((port) => (
                        <div
                          key={`${port.number}-${port.protocol}`}
                          className="grid grid-cols-5 gap-3 text-sm"
                        >
                          <div>
                            <span className="font-semibold">{port.number}</span>
                            /{port.protocol}
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getPortStateColor(
                                port.state
                              )}`}
                            >
                              <span className="mr-1">
                                {getPortStateIcon(port.state)}
                              </span>
                              {port.state}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {port.service || "-"}
                            {port.version && (
                              <span className="text-xs text-muted-foreground">
                                ({port.version})
                              </span>
                            )}
                            {port.vulnerabilities?.isVulnerable && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-amber-500">
                                      <AlertTriangle className="h-4 w-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px]">
                                    <p className="font-semibold">
                                      ⚠️ Vulnerable Version
                                    </p>
                                    <p className="text-xs">
                                      {port.vulnerabilities.vulnerabilityCount}{" "}
                                      known vulnerabilities found
                                      {port.vulnerabilities.highestScore && (
                                        <span>
                                          {" "}
                                          (highest CVSS:{" "}
                                          {port.vulnerabilities.highestScore.toFixed(
                                            1
                                          )}
                                          )
                                        </span>
                                      )}
                                    </p>
                                    {port.vulnerabilities.details &&
                                      port.vulnerabilities.details.length >
                                        0 && (
                                        <div className="mt-1 text-xs">
                                          <p className="font-medium">
                                            Example:{" "}
                                            {port.vulnerabilities.details[0].id}
                                          </p>
                                          <p>
                                            {port.vulnerabilities.details[0].description.substring(
                                              0,
                                              100
                                            )}
                                            ...
                                          </p>
                                        </div>
                                      )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {loading[
                              `${host.ip}-${port.number}-${port.protocol}`
                            ] && <div className="animate-spin">⟳</div>}
                          </div>
                          <div>{host.macAddress || "-"}</div>
                          <div>{host.vendor || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
