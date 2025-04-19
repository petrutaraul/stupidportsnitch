// Structured types for parsed scan results
export interface Port {
  number: number;
  protocol: string;
  state: "open" | "closed" | "filtered" | "unfiltered" | "unknown";
  service?: string;
  version?: string;
  // Vulnerability information
  vulnerabilities?: {
    isVulnerable: boolean;
    highestScore?: number;
    vulnerabilityCount: number;
    details?: Array<{
      id: string;
      description: string;
      cvssScore?: number;
      url?: string;
    }>;
  };
}

export interface Host {
  ip: string;
  hostname?: string;
  os?: string;
  macAddress?: string;
  vendor?: string;
  ports: Port[];
}

export interface ParsedScanResult {
  hosts: Host[];
  scanInfo?: {
    scanType?: string;
    startTime?: string;
    completedTime?: string;
    duration?: string;
  };
}

/**
 * Parses raw nmap output into structured data
 */
export function parseNmapOutput(output: string): ParsedScanResult {
  if (!output) {
    return { hosts: [] };
  }

  const result: ParsedScanResult = {
    hosts: [],
    scanInfo: {},
  };

  // Extract scan info
  const startTimeMatch = output.match(
    /Starting Nmap ([0-9.]+) \( http:\/\/nmap\.org \) at (.*)/
  );
  if (startTimeMatch) {
    result.scanInfo = {
      ...result.scanInfo,
      startTime: startTimeMatch[2],
    };
  }

  const scanTypeMatch = output.match(/Nmap scan report for (.*)/);
  if (scanTypeMatch) {
    result.scanInfo = {
      ...result.scanInfo,
      scanType: scanTypeMatch[1],
    };
  }

  // Extract hosts and ports
  const hostBlocks = output.split(/Nmap scan report for /);

  // Skip the first entry as it's usually just the header
  for (let i = 1; i < hostBlocks.length; i++) {
    const hostBlock = hostBlocks[i];
    let currentHost: Host = {
      ip: "",
      ports: [],
    };

    // Extract hostname/IP
    const hostMatch = hostBlock.match(/^([^\s]+)/);
    if (hostMatch) {
      // Check if it's an IP or hostname
      if (/^\d+\.\d+\.\d+\.\d+$/.test(hostMatch[1])) {
        currentHost.ip = hostMatch[1];
      } else {
        currentHost.hostname = hostMatch[1];
        // Try to find IP if hostname is primary
        const ipMatch = hostBlock.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          currentHost.ip = ipMatch[1];
        }
      }
    }

    // Extract OS info
    const osMatch = hostBlock.match(/OS details: ([^\n]+)/);
    if (osMatch) {
      currentHost.os = osMatch[1].trim();
    }

    // Extract port information
    const portLines = hostBlock.match(/(\d+)\/(tcp|udp)\s+(\w+)\s+([^\n]*)/g);
    if (portLines) {
      for (const portLine of portLines) {
        const parts = portLine.match(/(\d+)\/(tcp|udp)\s+(\w+)\s+(.*)/);
        if (parts) {
          const serviceInfo = parts[4].trim();

          // Better parsing of service and version info
          let service: string | undefined = undefined;
          let version: string | undefined = undefined;

          if (serviceInfo) {
            // Try to split into service and version (e.g., "Apache httpd 2.4.29")
            const versionMatch = serviceInfo.match(
              /^([^\d]+)\s+(\d+\.\d+[\.\d]*)/
            );
            if (versionMatch) {
              service = versionMatch[1].trim();
              version = versionMatch[2].trim();
            } else {
              service = serviceInfo;
            }
          }

          const port: Port = {
            number: parseInt(parts[1], 10),
            protocol: parts[2],
            state: parts[3] as
              | "open"
              | "closed"
              | "filtered"
              | "unfiltered"
              | "unknown",
            service,
            version,
          };
          currentHost.ports.push(port);
        }
      }
    }

    // Extract MAC address and vendor
    const macMatch = hostBlock.match(
      /MAC Address: ([0-9A-Fa-f:]+) \(([^)]+)\)/
    );
    if (macMatch) {
      currentHost.macAddress = macMatch[1];
      currentHost.vendor = macMatch[2];
    }

    if (currentHost.ip) {
      result.hosts.push(currentHost);
    }
  }

  // Extract completion time
  const completedMatch = output.match(/Nmap done at (.*?)(?:, | \()/);
  if (completedMatch) {
    result.scanInfo = {
      ...result.scanInfo,
      completedTime: completedMatch[1].trim(),
    };
  }

  const durationMatch = output.match(/(\d+\.\d+) seconds/);
  if (durationMatch) {
    result.scanInfo = {
      ...result.scanInfo,
      duration: `${durationMatch[1]} seconds`,
    };
  }

  return result;
}
