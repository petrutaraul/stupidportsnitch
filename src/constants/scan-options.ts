import { ScanOption } from "../types/scan";

export const scanOptions: ScanOption[] = [
  {
    id: "sS",
    label: "Stealth Scan",
    description: "TCP SYN scan - doesn't complete TCP connections",
    parameter: "-sS",
    requiresRoot: true,
  },
  {
    id: "sV",
    label: "Version Detection",
    description: "Probe open ports to determine service/version info",
    parameter: "-sV",
  },
  {
    id: "O",
    label: "OS Detection",
    description: "Attempt to determine OS of target (requires root privileges)",
    parameter: "-O",
    requiresRoot: true,
  },
  {
    id: "A",
    label: "Aggressive Scan",
    description:
      "Enable OS detection, version detection, script scanning, and traceroute (requires root privileges)",
    parameter: "-A",
    requiresRoot: true,
  },
  {
    id: "p",
    label: "Common Ports",
    description: "Scan most common ports",
    parameter: "-F",
  },
  {
    id: "v",
    label: "Verbose Output",
    description: "Increase verbosity level",
    parameter: "-v",
  },
];
