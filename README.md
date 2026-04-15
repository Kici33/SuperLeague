# SuperLeague

![Super League](https://img.shields.io/badge/Super%20League-v1.0.0-blue?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDcuNVY0LjVDNCAzLjQgNC45IDIuNSA2IDIuNUgxOEM5LjEgMi41IDEyIDVsIDAgMGwwIDB6Ii8+PC9zdmc+)
![Status](https://img.shields.io/badge/Status-WIP-yellow?style=flat-square)
![License](https://img.shields.io/badge/License-GPL%203.0-green?style=flat-square)

> **⚠️ WARNING**: This application is in early **Work In Progress (WIP)** phase. Features may break, change, or be removed without notice. Use at your own risk.

A modern League of Legends companion application built with Tauri, React, and TypeScript. SuperLeague provides an intuitive desktop interface to interact with the League of Legends client, offering real-time summoner information, ranked statistics, and useful League of Legends tools.

## Overview

SuperLeague is a desktop application that connects directly to your League of Legends client via the LCU (League Client Update) API. It provides a clean, modern interface for viewing your account information, ranked statistics, and accessing various League of Legends utilities.

### Key Features

- **Dashboard**: Overview of your current ranked status with visual rank display
- **Real-time Summoner Data**: Connected to the League of Legends client for live account information
- **Ranked Statistics**: View your Solo Queue and Flex Ranked ratings, divisions, and LP
- **Player Information**: Display summoner name, level, and profile information
- **Progress Tracking**: Monitor your ranking progression
- **Community Features**: Integrate with other players and tools
- **League Tools**: Utility tools for League of Legends players

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **UI Framework**: Tauri 2 (Rust-based desktop framework)
- **Styling**: Tailwind CSS with PostCSS
- **UI Components**: Radix UI (accessible component library)
- **Data Visualization**: Recharts
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **Backend**: Rust (Tauri)

## Project Structure

```
.
├── src/                    # Frontend TypeScript/React code
│   ├── App.tsx            # Main application component
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and helpers
│   └── assets/            # Frontend assets
├── src-tauri/             # Tauri backend (Rust)
│   ├── src/               # Rust source code
│   ├── capabilities/      # Tauri security capabilities
│   ├── icons/             # Application icons
│   └── tauri.conf.json    # Tauri configuration
├── public/                # Static public assets
├── dist/                  # Built application (generated)
├── tailwind.config.js     # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## Getting Started

### Prerequisites

- **Node.js** 16+ and npm/yarn
- **Rust** 1.70+ (for Tauri development)
- **League of Legends Client** (for LCU API connectivity)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd superleague
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Rust environment (if developing Tauri backend):
   ```bash
   rustup update
   ```

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the Vite dev server with hot module replacement and the Tauri development window.

### Building for Development Testing

```bash
npm run build
```

Compiles TypeScript and builds the Vite bundle for Tauri.

### Running the Desktop App

To run the packaged desktop application (after building):

```bash
npm run tauri -- dev
```

Or use the build preview:

```bash
npm run preview
```

## Project Scripts

- `npm run dev` - Start development server with Vite
- `npm run build` - Compile TypeScript and build with Vite
- `npm run preview` - Preview the built application
- `npm run tauri` - Run Tauri CLI commands

## LCU Integration

SuperLeague connects to the League of Legends client via the LCU API. The app automatically detects and connects to a running League client, providing real-time data about your summoner, ranked status, and more.

**Note**: The League of Legends client must be running for the app to connect and retrieve data.

## Configuration

### Tauri Configuration

The application is configured via `src-tauri/tauri.conf.json`:

- **Product Name**: super-league
- **Version**: 1.0.0
- **Identifier**: com.superleague.app
- **Window Size**: 1060x960 pixels

### Development Settings

- **Dev URL**: http://127.0.0.1:1420
- **Dev Port**: 1420 (Vite)
- **HMR Port**: 1421 (Hot Module Replacement)

## IDE Setup

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [Rust Analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Styling

The project uses Tailwind CSS for styling with the following utilities:

- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **Autoprefixer**: Automatic vendor prefixes
- **Tailwind Merge**: Smart class name merging

## Component Library

SuperLeague uses Radix UI components for accessible, unstyled UI primitives:

- Dialog, Dropdown Menu, Hover Card
- Select, Tabs, Tooltip
- Progress Bar, Scroll Area
- Separator, Label, Slot

## Development Workflow

1. **Frontend Development**: Make changes in `src/` - Vite will hot-reload
2. **Tauri Backend**: Modify Rust code in `src-tauri/src/` and restart dev server
3. **Build**: Run `npm run build` before creating releases
4. **Testing**: Test the built application with `npm run preview`

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [League of Legends LCU API](https://developer.riotgames.com/)

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

This GPL license ensures compliance with Riot's requirements for third-party League of Legends applications and guarantees that modifications and improvements remain open-source.

## Contributing

We welcome contributions from the community! Here's how to contribute:

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/superleague.git`
3. Create a new branch for your feature: `git checkout -b feature/my-feature`
4. Make your changes and commit with clear messages
5. Push to your branch: `git push origin feature/my-feature`
6. Open a Pull Request with a clear description of your changes

### Pull Request Guidelines

- **Describe what you're fixing or adding** - Provide context for your changes
- **Link related issues** - Reference any issues your PR addresses
- **Test your changes** - Ensure the app still builds and runs correctly
- **Follow the existing code style** - Keep consistency with the current codebase
- **Keep PRs focused** - One feature or fix per PR is preferred
- **Add comments if needed** - Only comment code that needs clarification

### Reporting Issues

If you find a bug or have a feature request, please open an issue with:

- A clear title describing the problem
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Your system information (OS, Node/Rust versions)

## Roadmap & TODO

Since version 1.0.0 was released with limited polish time, the following features are planned for future versions:

- [ ] Caching of user data
- [ ] Support for multiple accounts that persist during app sessions
- [ ] Active Game Minimal Data display
- [ ] Additional Fun Tools
- [ ] Complete UI/UX redesign once core functionality is stable

**UI/UX Designers Wanted!** If you're interested in helping design a beautiful new interface for SuperLeague, feel free to reach out on our [Discord server](https://discord.gg/bF5B6RXAhQ)!

## Support

For issues, questions, or suggestions, please open an issue on the repository or join our [Discord community](https://discord.gg/bF5B6RXAhQ).
