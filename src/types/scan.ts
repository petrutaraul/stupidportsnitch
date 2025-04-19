export interface ScanOption {
  id: string;
  label: string;
  description: string;
  parameter: string;
  requiresRoot?: boolean;
}

export interface ScanPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  parameter: string;
  requiresRoot?: boolean;
}

export interface ScanResult {
  success: boolean;
  output?: string;
  error?: string;
}
