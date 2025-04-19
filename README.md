# Stupid Port Snitch

A beautiful desktop application for running Nmap network scans with a modern user interface. Built with Electron, React, TypeScript, and Tailwind CSS.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Nmap installed on your system
  - macOS: `brew install nmap`
  - Linux: `sudo apt-get install nmap`
  - Windows: Download from [nmap.org](https://nmap.org/download.html)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/petrutaraul/stupidportsnitch.git
cd stupidportsnitch
```

2. Install dependencies:

```bash
npm install
```

## Development

To run the application in development mode:

```bash
npm run electron:dev
```

## Building

To build the application for your platform:

```bash
npm run electron:build
```

The built application will be available in the `release` directory.

## Features

- Modern, responsive UI with dark mode support
- Simple and intuitive interface for running Nmap scans
- Real-time scan results display
- Cross-platform support (macOS, Linux, Windows)
- Scan Multiple Targets simultaneously
- Detailed Service Detection
- Advanced Scan Presets for different scanning scenarios
- Interactive Network Map visualization (Visual Feature)
- Export Results in various formats
- Scan History with Tags for better organization
- Passive Vulnerability Lookup
- Custom NSE Scripts support - drop in your own Nmap scripts
- Theme switching between light and dark modes

## Screenshots

![Main Dashboard](public/screenshots/stupid-port-snitch1.png)

![Scan Results](public/screenshots/stupid-port-snitch2.png)

![Network Map](public/screenshots/stupid-port-snitch3.png)

![Dark Mode Interface](public/screenshots/stupid-port-snitch4.png)

![Advanced Settings](public/screenshots/stupid-port-snitch5.png)

![Service Detection](public/screenshots/stupid-port-snitch6.png)

![Export Options](public/screenshots/stupid-port-snitch7.png)

![Scan History](public/screenshots/stupid-port-snitch8.png)

![Custom NSE Scripts](public/screenshots/stupid-port-snitch9.png)

## Usage

1. Launch the application
2. Enter the target IP address or hostname in the input field
3. Click "Start Scan" to begin the scan
4. View the results in the results section below

## Support this project - Buy me a coffee

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/raulpetruta)

## License

MIT
