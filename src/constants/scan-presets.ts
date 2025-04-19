import { ScanPreset } from "../types/scan";

export const scanPresets: ScanPreset[] = [
  {
    id: "sneaky",
    label: "Sneaky",
    emoji: "🕢",
    description: "Stealthy, slow scan",
    parameter: "-T1 -sS",
    requiresRoot: true,
  },
  {
    id: "quick",
    label: "Quick",
    emoji: "🚀",
    description: "Fast scan of common ports",
    parameter: "-T4 -F",
  },
  {
    id: "deep-dive",
    label: "Deep Dive",
    emoji: "🔍",
    description: "Aggressive scan (OS, version, etc)",
    parameter: "-A",
    requiresRoot: true,
  },
  {
    id: "full-port",
    label: "Full Port",
    emoji: "🌐",
    description: "Scan all 65535 ports",
    parameter: "-p-",
  },
];
