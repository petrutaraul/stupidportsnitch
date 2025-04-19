import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Panel,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Host, Port } from "../lib/parse-nmap-output";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Defining risky ports that should be highlighted
const RISKY_PORTS = [
  21, // FTP
  22, // SSH
  23, // Telnet
  25, // SMTP
  53, // DNS
  80, // HTTP
  443, // HTTPS
  3306, // MySQL
  3389, // RDP
  5432, // PostgreSQL
  8080, // HTTP Alternate
];

// Custom node component
function HostNode({ data, selected }: NodeProps) {
  const openPortCount = data.host.ports.filter(
    (p: Port) => p.state === "open"
  ).length;

  return (
    <div
      className={`rounded-lg p-2 shadow-md ${
        selected ? "ring-2 ring-primary ring-opacity-70" : ""
      }`}
    >
      {/* Target handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: "#555" }}
      />

      <div
        className={`text-xs font-medium p-2 rounded-md ${
          openPortCount > 0 ? "bg-blue-500 text-white" : "bg-muted"
        }`}
      >
        <div className="font-semibold">{data.host.ip}</div>
        {data.host.hostname && (
          <div className="text-xs opacity-80">{data.host.hostname}</div>
        )}
        {openPortCount > 0 && (
          <Badge variant="outline" className="mt-1 bg-blue-600">
            {openPortCount} open ports
          </Badge>
        )}
      </div>

      {/* Source handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ background: "#555" }}
      />
    </div>
  );
}

interface NetworkMapProps {
  hosts: Host[];
}

export function NetworkMap({ hosts }: NetworkMapProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Create nodes from hosts
  const initialNodes: Node[] = useMemo(() => {
    return hosts.map((host, index) => {
      // Position hosts in a circle-like layout
      const angle = (index / hosts.length) * 2 * Math.PI;
      const radius = 200;
      const x = radius * Math.cos(angle) + radius;
      const y = radius * Math.sin(angle) + radius;

      return {
        id: host.ip,
        position: { x, y },
        data: { host },
        type: "hostNode",
        // Add a target handle for edge connections
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      };
    });
  }, [hosts]);

  // Connect all hosts to a central router/internet node
  const initialEdges: Edge[] = useMemo(() => {
    if (hosts.length <= 1) return [];

    // Add a central internet/router node if we have multiple hosts
    const centralNodeId = "internet";

    return hosts.map((host) => ({
      id: `e-${centralNodeId}-${host.ip}`,
      source: centralNodeId,
      target: host.ip,
      sourceHandle: "source",
      targetHandle: "target",
      animated: true,
      style: { stroke: "#888" },
    }));
  }, [hosts]);

  // Custom internet/router node component
  const RouterNode = useCallback(({ data }: NodeProps) => {
    return (
      <div
        style={{
          background: "#f0f0f0",
          border: "1px solid #ccc",
          borderRadius: "50%",
          width: 60,
          height: 60,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "12px",
          position: "relative",
          padding: "4px",
          color: "#333",
        }}
      >
        {/* Source handle for connections to hosts */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          style={{ background: "#555" }}
        />

        <span style={{ zIndex: 10, fontWeight: "bold" }}>{data.label}</span>
      </div>
    );
  }, []);

  // Determine network details for the central node
  const networkDetails = useMemo(() => {
    // If no hosts, return default label
    if (hosts.length === 0) return "Network";

    // Try to extract network information from the first IP
    if (hosts.length > 0) {
      const firstIp = hosts[0].ip;
      // Get subnet by taking first 3 octets of IP (assuming typical Class C)
      const ipParts = firstIp.split(".");
      if (ipParts.length === 4) {
        return `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.*`;
      }
    }

    return "Network";
  }, [hosts]);

  // Add central internet node if we have multiple hosts
  const allInitialNodes = useMemo(() => {
    if (hosts.length <= 1) return initialNodes;

    return [
      ...initialNodes,
      {
        id: "internet",
        position: { x: 200, y: 200 },
        data: { label: networkDetails },
        type: "routerNode",
      },
    ];
  }, [initialNodes, hosts, networkDetails]);

  const [nodes, setNodes, onNodesChange] = useNodesState(allInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(
    () => ({
      hostNode: HostNode,
      routerNode: RouterNode,
    }),
    [RouterNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Only set selectedNode for actual host nodes, not the central internet node
      if (node.id !== "internet") {
        setSelectedNode(node.id === selectedNode ? null : node.id);
      }
    },
    [selectedNode]
  );

  // Selected host data
  const selectedHost = useMemo(() => {
    if (!selectedNode) return null;
    return hosts.find((h) => h.ip === selectedNode);
  }, [selectedNode, hosts]);

  // Identify risky ports in the selected host
  const riskyPorts = useMemo(() => {
    if (!selectedHost) return [];
    return selectedHost.ports.filter(
      (p) => p.state === "open" && RISKY_PORTS.includes(p.number)
    );
  }, [selectedHost]);

  const resetLayout = useCallback(() => {
    setNodes(allInitialNodes);
    setEdges(initialEdges);
  }, [allInitialNodes, initialEdges, setNodes, setEdges]);

  if (hosts.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No hosts found to display</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] border rounded-lg relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-right">
          <Button variant="outline" size="sm" onClick={resetLayout}>
            Reset Layout
          </Button>
        </Panel>
      </ReactFlow>

      {selectedHost && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 p-4 border-t">
          <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
            <span>
              Host: {selectedHost.ip}
              {selectedHost.hostname && ` (${selectedHost.hostname})`}
            </span>
            {riskyPorts.length > 0 && (
              <Badge variant="destructive">
                {riskyPorts.length} risky{" "}
                {riskyPorts.length === 1 ? "port" : "ports"}
              </Badge>
            )}
          </h3>

          <TooltipProvider>
            <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
              {selectedHost.ports
                .filter((port) => port.state === "open")
                .map((port) => {
                  const isRisky = RISKY_PORTS.includes(port.number);
                  return (
                    <Tooltip key={`${port.number}-${port.protocol}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`border rounded-md ${
                            isRisky ? "border-red-500" : "border-input"
                          } cursor-help shadow-sm`}
                        >
                          <div className="p-2 text-center text-xs">
                            <div className="font-medium">
                              {port.number}/{port.protocol}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {port.service || "unknown"}
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-bold">
                            {port.number}/{port.protocol} (
                            {port.service || "unknown"})
                          </div>
                          <div>{port.version || "No version information"}</div>
                          {isRisky && (
                            <div className="text-red-500 font-semibold mt-1">
                              Potentially risky port
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
            </div>
          </TooltipProvider>

          {selectedHost.ports.filter((port) => port.state === "open").length ===
            0 && (
            <p className="text-sm text-muted-foreground">No open ports found</p>
          )}
        </div>
      )}
    </div>
  );
}
