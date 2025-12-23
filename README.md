# Maintenance & Performance System

Automated auditing tool for the NovumFlow, CareFlow, and ComplyFlow healthcare ecosystems.

## Overview

This system uses **Lighthouse** and **Puppeteer** to perform deep audits of target applications. It measures:
- ⚡ **Performance**: Load times, interaction latency, and rendering.
- ♿ **Accessibility**: Compliance with WCAG standards.
- 🛡️ **Best Practices**: Security and modern web standards.
- 🔍 **SEO**: Search engine optimization and crawlability.

## Installation

```bash
npm install
```

## Usage

Run the maintenance sweep:

```bash
npm start
```

## Configuration

Targets and audit settings are managed in `config.js`:

```javascript
export const config = {
  targets: [
    { name: "NovumFlow", url: "https://...", id: "novumflow" },
    // Add more platforms here
  ],
  audit: {
    outputFormat: 'html', // 'json', 'html'
    reportDir: './reports'
  }
};
```

## Reports

Generated reports are saved in the `/reports` directory as timestamped HTML/JSON files.
