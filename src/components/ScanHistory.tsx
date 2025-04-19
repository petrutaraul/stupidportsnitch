import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Clock,
  Tag,
  Search,
  MoreVertical,
  Trash,
  Edit,
  ArrowLeftRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  ScanHistoryEntry,
  getHistory,
  deleteScanFromHistory,
  updateScanTags,
  getAllTags,
  findScansByTags,
  updateScanNotes,
  saveScanToHistory,
} from "../lib/scan-history";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { CompareScanResults } from "./CompareScanResults";

interface ScanHistoryProps {
  onLoadScan?: (scan: ScanHistoryEntry) => void;
}

export function ScanHistory({ onLoadScan }: ScanHistoryProps) {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ScanHistoryEntry[]>(
    []
  );
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [currentScan, setCurrentScan] = useState<ScanHistoryEntry | null>(null);
  const [compareScan, setCompareScan] = useState<ScanHistoryEntry | null>(null);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState("");

  // Load history on component mount and when tab is displayed
  useEffect(() => {
    // Load initial data
    loadHistoryData();

    // Set up interval to refresh data every 2 seconds
    const intervalId = setInterval(() => {
      loadHistoryData();
    }, 2000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Function to load history data
  const loadHistoryData = () => {
    const loadedHistory = getHistory();
    setHistory(loadedHistory);
    setFilteredHistory(loadedHistory);
    setAllTags(getAllTags());
  };

  // Filter history based on selected tags and search query
  useEffect(() => {
    let filtered = history;

    // Filter by tags if any are selected
    if (selectedTags.length > 0) {
      filtered = findScansByTags(selectedTags);
    }

    // Filter by search query if present
    if (searchQuery) {
      filtered = filtered.filter(
        (scan) =>
          scan.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scan.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          scan.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
  }, [history, selectedTags, searchQuery]);

  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  // Format scan parameters for display
  const formatParameters = (params: string[]) => {
    return params.join(" ");
  };

  const toggleTagSelection = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const openTagDialog = (scan: ScanHistoryEntry) => {
    setCurrentScan(scan);
    setShowTagDialog(true);
  };

  const openNotesDialog = (scan: ScanHistoryEntry) => {
    setCurrentScan(scan);
    setNotes(scan.notes || "");
    setShowNotesDialog(true);
  };

  const openCompareDialog = (scan: ScanHistoryEntry) => {
    setCurrentScan(scan);
    setShowCompareDialog(true);
  };

  // New function to open the scan details dialog
  const openDetailsDialog = (
    scan: ScanHistoryEntry,
    e: React.MouseEvent<HTMLTableRowElement>
  ) => {
    // Don't open the details dialog if we're clicking on a button or dropdown item
    if (
      e.target instanceof HTMLButtonElement ||
      (e.target as HTMLElement).closest('[role="menuitem"]') ||
      (e.target as HTMLElement).closest("[data-radix-collection-item]")
    ) {
      return;
    }

    setCurrentScan(scan);
    setShowDetailsDialog(true);
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !currentScan) return;

    // Check if tag already exists for this scan
    if (currentScan.tags.includes(newTag.trim())) {
      setNewTag("");
      return;
    }

    const updatedTags = [...currentScan.tags, newTag.trim()];
    const updatedScan = updateScanTags(currentScan.id, updatedTags);

    if (updatedScan) {
      // Update history
      setHistory(getHistory());
      setAllTags(getAllTags());
      setCurrentScan(updatedScan);
    }

    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!currentScan) return;

    const updatedTags = currentScan.tags.filter((t) => t !== tag);
    const updatedScan = updateScanTags(currentScan.id, updatedTags);

    if (updatedScan) {
      // Update history
      setHistory(getHistory());
      setAllTags(getAllTags());
      setCurrentScan(updatedScan);
    }
  };

  const handleSaveNotes = () => {
    if (!currentScan) return;

    const updatedScan = updateScanNotes(currentScan.id, notes);

    if (updatedScan) {
      // Update history
      setHistory(getHistory());
      setShowNotesDialog(false);
    }
  };

  const handleDeleteScan = (scan: ScanHistoryEntry) => {
    if (
      window.confirm("Are you sure you want to delete this scan from history?")
    ) {
      const deleted = deleteScanFromHistory(scan.id);

      if (deleted) {
        // Update history and tags
        const refreshedHistory = getHistory();
        setHistory(refreshedHistory);
        setAllTags(getAllTags());
      }
    }
  };

  // Handler for saving current scan back to history (creates a new entry)
  const handleSaveToHistory = (scan: ScanHistoryEntry) => {
    try {
      // Create a new entry based on the current scan
      const newScan = saveScanToHistory(
        scan.target,
        scan.scanParameters,
        scan.parsedResults,
        scan.rawOutput,
        scan.tags,
        scan.notes || "",
        true // Force save even if it's a duplicate
      );

      if (!newScan) {
        throw new Error("Failed to save scan to history");
      }

      // Get the refreshed history
      const refreshedHistory = getHistory();

      // Update both history states to ensure UI reflects the change
      setHistory(refreshedHistory);
      setFilteredHistory(refreshedHistory);

      // Close any open dialogs
      setShowDetailsDialog(false);

      // Show a more descriptive message
      alert(`Scan saved to history with ID: ${newScan.id.substring(0, 8)}`);

      return newScan;
    } catch (error) {
      console.error("Error saving scan to history:", error);
      alert(
        `Error saving scan: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return null;
    }
  };

  const handleSelectCompareTarget = (scan: ScanHistoryEntry) => {
    setCompareScan(scan);
  };

  // Count hosts with open ports
  const countHostsWithOpenPorts = (scan: ScanHistoryEntry) => {
    return scan.parsedResults.hosts.filter((host) =>
      host.ports.some((port) => port.state === "open")
    ).length;
  };

  // Count total open ports
  const countOpenPorts = (scan: ScanHistoryEntry) => {
    return scan.parsedResults.hosts.reduce(
      (sum, host) => sum + host.ports.filter((p) => p.state === "open").length,
      0
    );
  };

  const loadScanIntoMainTab = (scan: ScanHistoryEntry) => {
    if (onLoadScan) {
      onLoadScan(scan);
      setShowDetailsDialog(false);
    }
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            No scan history yet. Run scans to build your history.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            View and compare your previous scans
          </CardDescription>
          <div className="flex flex-col gap-3 mt-4">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search targets, tags or notes..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTagSelection(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {selectedTags.length > 0 && (
                <Badge
                  variant="outline"
                  className="cursor-pointer bg-destructive/10 hover:bg-destructive/20 text-destructive"
                  onClick={() => setSelectedTags([])}
                >
                  Clear filters
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No scan history found matching your search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((scan) => (
                    <TableRow
                      key={scan.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={(e) => openDetailsDialog(scan, e)}
                    >
                      <TableCell className="font-medium">
                        {scan.target}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatTimestamp(scan.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scan.tags.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              No tags
                            </span>
                          ) : (
                            scan.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Hosts: {scan.parsedResults.hosts.length}</div>
                          <div>Open ports: {countOpenPorts(scan)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {scan.notes ? (
                          scan.notes.length > 50 ? (
                            `${scan.notes.substring(0, 50)}...`
                          ) : (
                            scan.notes
                          )
                        ) : (
                          <span className="text-muted-foreground">
                            No notes
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {formatParameters(scan.scanParameters)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openTagDialog(scan)}
                            >
                              <Tag className="mr-2 h-4 w-4" />
                              <span>Manage tags</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openNotesDialog(scan)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Add notes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCompareDialog(scan)}
                            >
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              <span>Compare with another scan</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteScan(scan)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tag Management Dialog */}
      {currentScan && (
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Tags</DialogTitle>
              <DialogDescription>
                Add or remove tags for scan of {currentScan.target}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddTag();
                    }
                  }}
                />
                <Button onClick={handleAddTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {currentScan.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tags yet. Add some above.
                  </p>
                ) : (
                  currentScan.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-2 py-1">
                      {tag}
                      <button
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ✕
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Notes Dialog */}
      {currentScan && (
        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan Notes</DialogTitle>
              <DialogDescription>
                Add notes about this scan of {currentScan.target}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Textarea
                placeholder="Add notes about this scan (e.g., purpose, findings, follow-up items)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[150px]"
              />
              <Button onClick={handleSaveNotes}>Save Notes</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Compare Dialog */}
      {currentScan && (
        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Compare Scans</DialogTitle>
              <DialogDescription>
                Select another scan of {currentScan.target} to compare with
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {compareScan ? (
                <CompareScanResults scan1={currentScan} scan2={compareScan} />
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Select a scan to compare with:
                  </p>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {history
                        .filter(
                          (scan) =>
                            scan.id !== currentScan.id &&
                            scan.target === currentScan.target
                        )
                        .map((scan) => (
                          <div
                            key={scan.id}
                            className="p-3 border rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => handleSelectCompareTarget(scan)}
                          >
                            <div className="font-medium">{scan.target}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimestamp(scan.timestamp)} •{" "}
                              {formatParameters(scan.scanParameters)}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scan.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      {history.filter(
                        (scan) =>
                          scan.id !== currentScan.id &&
                          scan.target === currentScan.target
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No other scans found for the same target (
                          {currentScan.target})
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
              {compareScan && (
                <Button variant="outline" onClick={() => setCompareScan(null)}>
                  Select a different scan
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Scan Details Dialog */}
      {currentScan && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Scan Details</DialogTitle>
              <DialogDescription>
                Details for scan of {currentScan.target}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Scan summary */}
              <div className="bg-muted/40 rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Target</p>
                    <p className="text-sm">{currentScan.target}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Scan Time</p>
                    <p className="text-sm">
                      {new Date(currentScan.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Parameters</p>
                    <p className="text-sm font-mono">
                      {currentScan.scanParameters.join(" ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Results</p>
                    <p className="text-sm">
                      {currentScan.parsedResults.hosts.length} hosts,{" "}
                      {countHostsWithOpenPorts(currentScan)} with open ports,{" "}
                      {countOpenPorts(currentScan)} total open ports
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes section */}
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                {currentScan.notes ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {currentScan.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No notes added for this scan.
                  </p>
                )}
              </div>

              {/* Tags section */}
              <div>
                <p className="text-sm font-medium mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {currentScan.tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tags added for this scan.
                    </p>
                  ) : (
                    currentScan.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Scan results preview */}
              <div>
                <p className="text-sm font-medium mb-2">Results Preview</p>
                <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                  {currentScan.parsedResults.hosts.length > 0 ? (
                    <div className="p-2">
                      {currentScan.parsedResults.hosts.map((host, idx) => (
                        <div
                          key={idx}
                          className="mb-4 border-b pb-3 last:border-0 last:mb-0 last:pb-0"
                        >
                          <p className="font-medium">
                            {host.ip}{" "}
                            {host.hostname ? `(${host.hostname})` : ""}
                          </p>
                          {host.ports.length > 0 ? (
                            <table className="w-full text-sm mt-2">
                              <thead className="bg-muted/40">
                                <tr>
                                  <th className="text-left p-1">Port</th>
                                  <th className="text-left p-1">State</th>
                                  <th className="text-left p-1">Service</th>
                                  <th className="text-left p-1">Version</th>
                                </tr>
                              </thead>
                              <tbody>
                                {host.ports.slice(0, 10).map((port, pidx) => (
                                  <tr
                                    key={pidx}
                                    className="border-b border-muted/30 last:border-0"
                                  >
                                    <td className="p-1">
                                      {port.number}/{port.protocol}
                                    </td>
                                    <td
                                      className={`p-1 ${
                                        port.state === "open"
                                          ? "text-green-600"
                                          : port.state === "closed"
                                          ? "text-red-600"
                                          : port.state === "filtered"
                                          ? "text-yellow-600"
                                          : "text-gray-600"
                                      } font-medium`}
                                    >
                                      {port.state}
                                    </td>
                                    <td className="p-1">
                                      {port.service || "-"}
                                    </td>
                                    <td className="p-1">
                                      {port.version || "-"}
                                    </td>
                                  </tr>
                                ))}
                                {host.ports.length > 10 && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="p-1 text-center text-sm text-muted-foreground"
                                    >
                                      ... and {host.ports.length - 10} more
                                      ports
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              No open ports detected on this host
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No hosts found in this scan
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSaveToHistory(currentScan)}
              >
                Duplicate Scan
              </Button>
              <Button onClick={() => loadScanIntoMainTab(currentScan)}>
                Load in Scan Tab
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
