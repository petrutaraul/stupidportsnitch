import { useEffect, useState } from "react";
import {
  ScanHistoryEntry,
  ScanDifference,
  compareTwoScans,
} from "../lib/scan-history";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle, ArrowDown, ArrowUp, Minus } from "lucide-react";

interface CompareScanResultsProps {
  scan1: ScanHistoryEntry;
  scan2: ScanHistoryEntry;
}

export function CompareScanResults({ scan1, scan2 }: CompareScanResultsProps) {
  const [differences, setDifferences] = useState<ScanDifference[]>([]);
  const [isComparing, setIsComparing] = useState(true);

  useEffect(() => {
    // We put this in a timeout to ensure the UI updates before potentially
    // heavy comparison work begins
    const timer = setTimeout(() => {
      const diff = compareTwoScans(scan1, scan2);
      setDifferences(diff);
      setIsComparing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [scan1, scan2]);

  // Format timestamps for display
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return `${date.toLocaleString()} (${formatDistanceToNow(date, {
        addSuffix: true,
      })})`;
    } catch (error) {
      return "Unknown time";
    }
  };

  // Format parameters for display
  const formatParameters = (params: string[]) => {
    return params.join(" ");
  };

  // Count total changes
  const countChanges = () => {
    let added = 0;
    let removed = 0;
    let changed = 0;

    differences.forEach((diff) => {
      added += diff.addedPorts.length;
      removed += diff.removedPorts.length;
      changed += diff.changedPorts.length;
    });

    return { added, removed, changed };
  };

  // Render the comparison skeleton while comparing
  if (isComparing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>

        <Skeleton className="h-8 w-full" />

        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  // Handle case where there are no differences
  if (differences.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium">Base scan</h3>
            <p className="text-sm text-muted-foreground">
              {formatTimestamp(scan1.timestamp)}
            </p>
            <p className="text-sm font-mono mt-1">
              {formatParameters(scan1.scanParameters)}
            </p>
          </div>

          <div className="text-right">
            <h3 className="text-sm font-medium">Comparison scan</h3>
            <p className="text-sm text-muted-foreground">
              {formatTimestamp(scan2.timestamp)}
            </p>
            <p className="text-sm font-mono mt-1">
              {formatParameters(scan2.scanParameters)}
            </p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No differences found between these two scans.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get counts for summary
  const { added, removed, changed } = countChanges();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium">Base scan</h3>
          <p className="text-sm text-muted-foreground">
            {formatTimestamp(scan1.timestamp)}
          </p>
          <p className="text-sm font-mono mt-1">
            {formatParameters(scan1.scanParameters)}
          </p>
        </div>

        <div className="text-right">
          <h3 className="text-sm font-medium">Comparison scan</h3>
          <p className="text-sm text-muted-foreground">
            {formatTimestamp(scan2.timestamp)}
          </p>
          <p className="text-sm font-mono mt-1">
            {formatParameters(scan2.scanParameters)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 py-2">
        {added > 0 && (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-600/20"
          >
            <ArrowDown className="mr-1 h-3 w-3" /> {added} new port
            {added !== 1 ? "s" : ""}
          </Badge>
        )}

        {removed > 0 && (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-600/20"
          >
            <ArrowUp className="mr-1 h-3 w-3" /> {removed} removed port
            {removed !== 1 ? "s" : ""}
          </Badge>
        )}

        {changed > 0 && (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-600/20"
          >
            <Minus className="mr-1 h-3 w-3" /> {changed} changed port
            {changed !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {differences.map((diff, index) => (
          <Card key={index}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">{diff.host}</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-3 text-sm">
                {diff.addedPorts.length > 0 && (
                  <div>
                    <div className="font-medium flex items-center mb-1 text-green-600">
                      <ArrowDown className="mr-1 h-4 w-4" /> New Open Ports
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {diff.addedPorts
                        .sort((a, b) => a - b)
                        .map((port) => (
                          <Badge
                            key={port}
                            variant="outline"
                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          >
                            {port}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {diff.removedPorts.length > 0 && (
                  <div>
                    <div className="font-medium flex items-center mb-1 text-red-600">
                      <ArrowUp className="mr-1 h-4 w-4" /> Closed Ports
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {diff.removedPorts
                        .sort((a, b) => a - b)
                        .map((port) => (
                          <Badge
                            key={port}
                            variant="outline"
                            className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          >
                            {port}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {diff.changedPorts.length > 0 && (
                  <div>
                    <div className="font-medium flex items-center mb-1 text-amber-600">
                      <Minus className="mr-1 h-4 w-4" /> Changed Ports
                    </div>
                    <div className="space-y-1">
                      {diff.changedPorts
                        .sort((a, b) => a.port - b.port)
                        .map((change) => (
                          <div
                            key={change.port}
                            className="border rounded-md p-2"
                          >
                            <div className="font-medium">{change.port}</div>
                            <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                              <div className="p-1 bg-background rounded">
                                Before: {change.before}
                              </div>
                              <div className="p-1 bg-background rounded">
                                After: {change.after}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
