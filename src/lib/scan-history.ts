// Scan history storage and management
import { Host, ParsedScanResult } from "./parse-nmap-output";

export interface ScanHistoryEntry {
  id: string;
  target: string;
  timestamp: string;
  scanParameters: string[];
  parsedResults: ParsedScanResult;
  rawOutput: string;
  tags: string[];
  notes?: string;
}

// Storage key for saving scan history
const STORAGE_KEY = "stupid-port-snitch-scan-history";

/**
 * Create a scan entry without saving it to history
 */
export function createScanEntry(
  target: string,
  parameters: string[],
  parsedResults: ParsedScanResult,
  rawOutput: string,
  tags: string[] = [],
  notes: string = ""
): ScanHistoryEntry {
  // Generate a truly unique ID using UUID v4 pattern
  const uniqueId = `scan-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const entry: ScanHistoryEntry = {
    id: uniqueId,
    target,
    timestamp: new Date().toISOString(),
    scanParameters: parameters,
    parsedResults,
    rawOutput,
    tags,
    notes: notes || undefined, // Only add notes if provided
  };

  return entry;
}

/**
 * Save a scan to history
 */
export function saveScanToHistory(
  target: string,
  parameters: string[],
  parsedResults: ParsedScanResult,
  rawOutput: string,
  tags: string[] = [],
  notes: string = "",
  forceSave: boolean = false
): ScanHistoryEntry {
  const history = getHistory();

  // Create the scan entry
  const entry = createScanEntry(
    target,
    parameters,
    parsedResults,
    rawOutput,
    tags
  );

  // Add notes if provided
  if (notes) {
    entry.notes = notes;
  }

  // Check if we should check for duplicates (not when explicitly duplicating)
  if (!forceSave) {
    // Check if a similar scan already exists (same target, parameters, and result hash)
    const resultHash = JSON.stringify(parsedResults.hosts.map((h) => h.ip));
    const existingScan = history.find(
      (scan) =>
        scan.target === target &&
        JSON.stringify(scan.scanParameters) === JSON.stringify(parameters) &&
        JSON.stringify(scan.parsedResults.hosts.map((h) => h.ip)) === resultHash
    );

    if (!existingScan) {
      // Only add to history if no similar scan exists
      history.push(entry);
      saveHistory(history);
    }
  } else {
    // Force save the entry (for duplicates)
    history.push(entry);
    saveHistory(history);
  }

  return entry;
}

/**
 * Get full scan history
 */
export function getHistory(): ScanHistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load scan history", e);
  }

  return [];
}

/**
 * Save the history array to local storage
 */
function saveHistory(history: ScanHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save scan history", e);
  }
}

/**
 * Delete a scan from history
 */
export function deleteScanFromHistory(id: string): boolean {
  const history = getHistory();
  const newHistory = history.filter((entry) => entry.id !== id);

  if (newHistory.length !== history.length) {
    saveHistory(newHistory);
    return true;
  }

  return false;
}

/**
 * Update scan tags
 */
export function updateScanTags(
  id: string,
  tags: string[]
): ScanHistoryEntry | null {
  const history = getHistory();
  const entryIndex = history.findIndex((entry) => entry.id === id);

  if (entryIndex >= 0) {
    history[entryIndex].tags = tags;
    saveHistory(history);
    return history[entryIndex];
  }

  return null;
}

/**
 * Update scan notes
 */
export function updateScanNotes(
  id: string,
  notes: string
): ScanHistoryEntry | null {
  const history = getHistory();
  const entryIndex = history.findIndex((entry) => entry.id === id);

  if (entryIndex >= 0) {
    history[entryIndex].notes = notes;
    saveHistory(history);
    return history[entryIndex];
  }

  return null;
}

/**
 * Get all unique tags used across all scans
 */
export function getAllTags(): string[] {
  const history = getHistory();
  const tagSet = new Set<string>();

  history.forEach((entry) => {
    entry.tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet);
}

/**
 * Find scans with specific tags
 */
export function findScansByTags(tags: string[]): ScanHistoryEntry[] {
  const history = getHistory();

  if (tags.length === 0) {
    return history;
  }

  return history.filter((entry) =>
    tags.some((tag) => entry.tags.includes(tag))
  );
}

/**
 * Find scans for a specific target
 */
export function findScansByTarget(target: string): ScanHistoryEntry[] {
  const history = getHistory();
  return history.filter((entry) => entry.target.includes(target));
}

/**
 * Compare two scans and identify differences in open ports
 */
export interface ScanDifference {
  host: string;
  addedPorts: number[];
  removedPorts: number[];
  changedPorts: {
    port: number;
    before: string;
    after: string;
  }[];
}

export function compareTwoScans(
  scan1: ScanHistoryEntry,
  scan2: ScanHistoryEntry
): ScanDifference[] {
  const differences: ScanDifference[] = [];

  // Helper to get port map for a single host
  const getPortsForHost = (host: Host) => {
    const portMap: Record<
      number,
      { state: string; service?: string; version?: string }
    > = {};
    host.ports.forEach((port) => {
      portMap[port.number] = {
        state: port.state,
        service: port.service,
        version: port.version,
      };
    });
    return portMap;
  };

  // Create a map of hosts from scan1
  const hostsMap1: Record<string, Host> = {};
  scan1.parsedResults.hosts.forEach((host) => {
    hostsMap1[host.ip] = host;
  });

  // Compare hosts from scan2 against scan1
  scan2.parsedResults.hosts.forEach((host2) => {
    const host1 = hostsMap1[host2.ip];

    if (host1) {
      // Host exists in both scans, compare ports
      const ports1 = getPortsForHost(host1);
      const ports2 = getPortsForHost(host2);

      const allPortNumbers = new Set([
        ...Object.keys(ports1).map(Number),
        ...Object.keys(ports2).map(Number),
      ]);

      const addedPorts: number[] = [];
      const removedPorts: number[] = [];
      const changedPorts: ScanDifference["changedPorts"] = [];

      allPortNumbers.forEach((portNumber) => {
        const inScan1 = portNumber in ports1;
        const inScan2 = portNumber in ports2;

        if (!inScan1 && inScan2) {
          // Port was added in scan2
          addedPorts.push(portNumber);
        } else if (inScan1 && !inScan2) {
          // Port was removed in scan2
          removedPorts.push(portNumber);
        } else if (inScan1 && inScan2) {
          // Port exists in both scans, check if state changed
          if (
            ports1[portNumber].state !== ports2[portNumber].state ||
            ports1[portNumber].service !== ports2[portNumber].service ||
            ports1[portNumber].version !== ports2[portNumber].version
          ) {
            changedPorts.push({
              port: portNumber,
              before: `${ports1[portNumber].state} ${
                ports1[portNumber].service || ""
              } ${ports1[portNumber].version || ""}`.trim(),
              after: `${ports2[portNumber].state} ${
                ports2[portNumber].service || ""
              } ${ports2[portNumber].version || ""}`.trim(),
            });
          }
        }
      });

      if (
        addedPorts.length > 0 ||
        removedPorts.length > 0 ||
        changedPorts.length > 0
      ) {
        differences.push({
          host: host2.ip,
          addedPorts,
          removedPorts,
          changedPorts,
        });
      }
    } else {
      // Host exists only in scan2, all ports are new
      differences.push({
        host: host2.ip,
        addedPorts: host2.ports.map((p) => p.number),
        removedPorts: [],
        changedPorts: [],
      });
    }
  });

  // Check for hosts that exist only in scan1
  scan1.parsedResults.hosts.forEach((host1) => {
    const hostExistsInScan2 = scan2.parsedResults.hosts.some(
      (h) => h.ip === host1.ip
    );

    if (!hostExistsInScan2) {
      // Host exists only in scan1, all ports were removed
      differences.push({
        host: host1.ip,
        addedPorts: [],
        removedPorts: host1.ports.map((p) => p.number),
        changedPorts: [],
      });
    }
  });

  return differences;
}
