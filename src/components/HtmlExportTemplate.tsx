import React from "react";
import { ParsedScanResult } from "../lib/parse-nmap-output";
import "./ExportResultsHtml.scss";

interface HtmlExportProps {
  parsedResults: ParsedScanResult;
  rawOutput: string;
  scanTarget: string;
  scanParameters?: string[];
}

export const HtmlExportTemplate: React.FC<HtmlExportProps> = ({
  parsedResults,
  rawOutput,
  scanTarget,
}) => {
  const currentYear = new Date().getFullYear();
  const totalOpenPorts = parsedResults.hosts.reduce(
    (sum, host) => sum + host.ports.filter((p) => p.state === "open").length,
    0
  );

  return (
    <div className="html-export">
      <div className="header">
        <img
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEwklEQVR4nO2aX4hUVRzHP3dmZ3dndtXVdLfdRTT/YYpkQkFgQoYvkpCgD0VCRIH0EFFgZlAUPvYnxKf+vkSgSIH0EETtgxihSBgiVBDmpmWWrruuu7s7O7I7fzycM3tn5s7de+/MnTtxZr4w3Lnn/H73nO/9nd/5nXMGIkSIECFChAj/T1RlRLgdmA8MFlnUaeAoECvoE+FhYDmwxWeHzgJHgP2B+/cjoLEMFTzZtWuX5vsiDGxXSu1QSrXm6VhcKbVVKfUu8FqRRU0oYv+atFKqTSm17tCJE54LlFI7d+/enbfdYrGYAvry2lJqrVKqUSmV8FlvK/Aj8AawusiiOgy1H8/ExMRGYC7wNtDrfTEwMHA9n+EUUA204L5tlUAT8Fe+i6qcpvcC18f458BiYAXQbqiGGmAOsAZ4wVB+RpgL9Hsu1PrYc9jYDJvKzxCehE08ANiO3ZjfBVxJpVKJXA6iMZPJqHQ63WIjQLGABIwJuAO4N5VK/Z5MJmtisVgmnU5bsVhsRjIOhkwmowC6uro29/X1bRFC9CmlZgNfmmykCngU/UBeBD4Atjc3N89paGj4pLe3972RkZE64BTQZtD+o8DNwK/AX8Bp+8WsWbMudHd3L5k7d+764eHhhWfOnPnr4sWLbwIbDNltxcPQQmAOUAM0A08BxwKMKcM4d+6cSiaTSSllK6WUlDJtK5lMplOpVPz8+fOqwHhP2X3funWrSiQSw1LKDiklUspkIpG42tnZueXChQvKjtO8/WPA3cA30oyQp4CGAg+jYyIOHjw43NfX90gymVxYVVVVJ4QQyWTyH2BxIpE43d7evqynp+ed/v7+uM8hVw3cH4/Hu+rr6xtqa2urOzs7zwBHgdN24/F4POWKbMO1Vi9EjS8BlgVxQimlymazSilZ7Cnpa/GZ4pCSHGdhXYbSvf0uxmIJv6G/9yYXZRxZMDQeG7/SI+39QUZFIERUT09P38TERK2UEmGLlJLJycn+3t7evytAywkokUiMnj17NmdcK5VK1djYeCkWy7nPs4oFXhsmJiZ+amlp6bDb8upVV1dz7dq1LmBBufoWAAsAVVtbO9jd3b3IhXJdunRprL6+/rBSOtdRaZqnZyGIurq69qxYsWJra2vrx21tbZsHBwfvFEJsMMjwFYtCI0eDhwngkVAIy9QndHR0XBkaGlontX51dnauByZD1FIQRWrAVcP0JhSky7Jl/Pr16yMRvijGLwP7QnBm0uYwJOdvA38YbLsHaAzBPvMYicx058O09ylAL3AiQLs/AEvQQ+qhIMzLAvnAvHRPTw/xePwS+q2wZgoQipuaml5qaWk54JHvRJ9YvRdYa7CN9ei4wQRmojOzQKidXhpTFy5Eo4uBHmBbQDGvAe8Hi2hmCPW52Qh8AnwTsN1vgc8N25gaQunYFHxsWMzLxgftYr1j4ASDgbnVBmxRwGrDdqYGA63bcFgwDAfmmj32WmHY1tRgW+zu3bufVUptUXrJmZ4i9rYqpVqUUvPCFWMht/cBpVIqrpT6QimV8dnsLKXUeqXUSMhiLOT3PqLUW1o9aulPZKwwCchHna1NTUKKnpq+FOFAqcQv0Sdbo8B+0IfF8RLauAx8gp5ORwCm7G9HZMryRyWRiQgRIkSIECFC+PgX9Vnubd/O1l0AAAAASUVORK5CYII="
          className="logo"
          alt="Stupid Port Snitch"
        />
        <h1 className="app-title">Stupid Port Snitch - Scan Results</h1>
      </div>

      <div className="summary-box">
        <p>
          <strong>Target:</strong> {scanTarget}
        </p>
        <p>
          <strong>Timestamp:</strong> {new Date().toLocaleString()}
        </p>
        {parsedResults.scanInfo?.startTime && (
          <p>
            <strong>Start time:</strong> {parsedResults.scanInfo.startTime}
          </p>
        )}
        {parsedResults.scanInfo?.completedTime && (
          <p>
            <strong>Completed time:</strong>{" "}
            {parsedResults.scanInfo.completedTime}
          </p>
        )}
        {parsedResults.scanInfo?.duration && (
          <p>
            <strong>Duration:</strong> {parsedResults.scanInfo.duration}
          </p>
        )}
        <p>
          <strong>Total hosts:</strong> {parsedResults.hosts.length}
        </p>
        <p>
          <strong>Total open ports:</strong> {totalOpenPorts}
        </p>
      </div>

      {parsedResults.hosts.length === 0 ? (
        <div className="host-card">
          <div className="host-header">
            <h2>No hosts found</h2>
          </div>
          <div className="host-body">
            <p>No host or open port information was found in this scan.</p>
          </div>
        </div>
      ) : (
        parsedResults.hosts.map((host, hostIndex) => (
          <div className="host-card" key={hostIndex}>
            <div className="host-header">
              <h2>
                {host.ip}
                {host.hostname ? ` (${host.hostname})` : ""}
              </h2>
              {host.os && (
                <p>
                  <strong>OS:</strong> {host.os}
                </p>
              )}
            </div>
            <div className="host-body">
              <p>
                <strong>Open ports:</strong>{" "}
                {host.ports.filter((p) => p.state === "open").length}
              </p>

              {host.ports.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Port</th>
                      <th>State</th>
                      <th>Service</th>
                      <th>Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {host.ports.map((port, portIndex) => {
                      const stateClass =
                        port.state === "open"
                          ? "port-open"
                          : port.state === "closed"
                          ? "port-closed"
                          : port.state === "filtered"
                          ? "port-filtered"
                          : "";

                      return (
                        <tr key={portIndex}>
                          <td>
                            {port.number}/{port.protocol}
                          </td>
                          <td className={stateClass}>{port.state}</td>
                          <td>{port.service || "-"}</td>
                          <td>{port.version || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p>No port information available</p>
              )}
            </div>
          </div>
        ))
      )}

      <h2>Raw Scan Output</h2>
      <pre>{rawOutput}</pre>

      <footer className="footer">
        <p>
          © {currentYear} Stupid Port Snitch - A simple, modern UI for Nmap
          scanning
        </p>
        <p>
          If you find this tool useful, please consider supporting the
          developer:
        </p>
        <a
          href="https://buymeacoffee.com/raulpetruta"
          className="coffee-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          ☕ Buy me a coffee
        </a>
      </footer>
    </div>
  );
};

export default HtmlExportTemplate;
