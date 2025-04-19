// Vulnerability lookup service using the National Vulnerability Database (NVD) API

interface Vulnerability {
  id: string;
  description: string;
  cvssScore?: number;
  cvssVector?: string;
  references?: string[];
  published?: string;
  url?: string;
}

/**
 * Looks up vulnerabilities for a service and version using NVD API
 * This implementation is intentionally simple and focuses on passive detection
 * without sending active probes to the target.
 */
export async function lookupVulnerabilities(
  serviceName: string,
  serviceVersion: string
): Promise<Vulnerability[]> {
  if (!serviceName || !serviceVersion) {
    return [];
  }

  try {
    // Construct search query: "service_name+service_version"
    const searchQuery = `${serviceName}+${serviceVersion}`;
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(
      searchQuery
    )}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Stupid-Port-Snitch/1.0",
      },
    });

    if (!response.ok) {
      console.error("NVD API error:", response.statusText);
      return [];
    }

    const data = await response.json();

    // Process and parse the results
    if (!data.vulnerabilities || data.vulnerabilities.length === 0) {
      return [];
    }

    return data.vulnerabilities.map((vuln: any) => {
      const cve = vuln.cve;
      const metrics =
        cve.metrics?.cvssMetricV31?.[0] ||
        cve.metrics?.cvssMetricV30?.[0] ||
        cve.metrics?.cvssMetricV2?.[0];

      return {
        id: cve.id,
        description: cve.descriptions?.[0]?.value || "No description available",
        cvssScore: metrics?.cvssData?.baseScore,
        cvssVector: metrics?.cvssData?.vectorString,
        references: cve.references?.map((ref: any) => ref.url) || [],
        published: cve.published,
        url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
      };
    });
  } catch (error) {
    console.error("Error looking up vulnerabilities:", error);
    return [];
  }
}

/**
 * Checks if a service version has known vulnerabilities
 * Returns a simplified risk assessment for UI display
 */
export async function checkServiceRisk(
  serviceName: string,
  serviceVersion: string
): Promise<{
  isVulnerable: boolean;
  highestScore?: number;
  vulnerabilityCount: number;
  vulnerabilities: Vulnerability[];
}> {
  if (!serviceName || !serviceVersion) {
    return { isVulnerable: false, vulnerabilityCount: 0, vulnerabilities: [] };
  }

  // Clean up the service name and version
  const cleanServiceName = serviceName.trim().toLowerCase();
  const cleanServiceVersion = serviceVersion.trim();

  try {
    // Get vulnerabilities
    const vulnerabilities = await lookupVulnerabilities(
      cleanServiceName,
      cleanServiceVersion
    );

    if (vulnerabilities.length === 0) {
      return {
        isVulnerable: false,
        vulnerabilityCount: 0,
        vulnerabilities: [],
      };
    }

    // Find the highest CVSS score
    let highestScore = 0;
    for (const vuln of vulnerabilities) {
      if (vuln.cvssScore && vuln.cvssScore > highestScore) {
        highestScore = vuln.cvssScore;
      }
    }

    return {
      isVulnerable: true,
      highestScore,
      vulnerabilityCount: vulnerabilities.length,
      vulnerabilities,
    };
  } catch (error) {
    console.error("Error checking service risk:", error);
    return { isVulnerable: false, vulnerabilityCount: 0, vulnerabilities: [] };
  }
}

// Extract service and version from a combined string
export function extractServiceVersion(serviceString: string): {
  service: string;
  version: string | null;
} {
  if (!serviceString) {
    return { service: "", version: null };
  }

  // Common patterns in nmap output
  // Example: "Apache httpd 2.4.29"
  const versionMatch = serviceString.match(/^(.*?)\s+(\d+\.\d+[\.\d]*)/);

  if (versionMatch) {
    return {
      service: versionMatch[1].trim(),
      version: versionMatch[2].trim(),
    };
  }

  return { service: serviceString.trim(), version: null };
}
