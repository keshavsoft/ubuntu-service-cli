# ubuntu-service-cli

[![npm](https://img.shields.io/npm/v/ubuntu-service-cli.svg)](https://www.npmjs.com/package/ubuntu-service-cli)
[![GitHub Pages](https://img.shields.io/badge/docs-GitHub_Pages-blue)](https://keshavsoft.github.io/ubuntu-service-cli/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![KeshavSoft](https://img.shields.io/badge/org-KeshavSoft-purple)](https://github.com/keshavsoft)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#zero-dependencies)

> **Inspect, check, and manage Ubuntu systemd services matching KeshavSoft VPS domain conventions.**  
> The human lens for `/etc/systemd/system/` — companion to [`caddy-cli`](https://github.com/keshavsoft/caddy-cli).

---

## 🌐 Live Documentation Portal

Interactive web dashboard, live terminal simulator, and VPS architecture guide:  
👉 **[https://keshavsoft.github.io/ubuntu-service-cli/](https://keshavsoft.github.io/ubuntu-service-cli/)**

---

## 📖 The Story: The Missing Half of Cloud Reverse Proxying

When deploying Node.js applications to a production Ubuntu VPS, cloud hosting naturally splits into two distinct halves:

```
[ Inbound HTTPS Requests :443 ]
               │
               ▼
┌──────────────────────────────┐
│     THE FRONT-DOOR GATEWAY   │  Managed by: caddy-cli
│      Caddy Reverse Proxy     │  Config: /etc/caddy/caddy.json
│    (SSL Termination & TLS)   │
└──────────────┬───────────────┘
               │  localhost:3000
               ▼
┌──────────────────────────────┐
│     THE BACKEND ENGINE       │  Managed by: ubuntu-service-cli
│   Native Systemd Services    │  Units: /etc/systemd/system/*.service
│   (Auto-restart, Boot, Logs) │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Node.js Application    │  Location: /root/KeshavSoft/<app>
│    (appointment-notifier)    │  Port: 3000
└──────────────────────────────┘
```

1. **The Front Door (`caddy-cli`)**: Caddy receives public traffic on ports `80`/`443`, terminates TLS certificates automatically, and reverse proxies requests to internal ports (`localhost:3000`, `:9011`, `:9012`...).
2. **The Backend Engine (`ubuntu-service-cli`)**: But Caddy *does not run your Node.js apps*. If no process is listening on `localhost:3000`, Caddy serves a `502 Bad Gateway`. 

### The KeshavSoft 1-to-1 Architecture Convention
To achieve bulletproof clarity without confusing multi-app runners, KeshavSoft adheres to a strict **1-to-1 domain-to-service mapping**:

| Domain Name | Systemd Unit (`/etc/systemd/system/`) | Working Directory | Internal Port |
| :--- | :--- | :--- | :---: |
| `appointment.keshavsoft.com` | `appointment.keshavsoft.com.service` | `/root/KeshavSoft/appointment-notifier` | `3000` |
| `lab14.keshavsoft.com` | `lab14.keshavsoft.com.service` | `/root/KeshavSoft/lab14.keshavsoft.com` | `9012` |
| `mani3.keshavsoft.com` | `mani3.keshavsoft.com.service` | `/root/KeshavSoft/mani3.keshavsoft.com` | `3025` |
| `quotation.keshavsoft.com` | `quotation.keshavsoft.com.service` | `/root/KeshavSoft/quotation.keshavsoft.com` | `9011` |
| `rk2.keshavsoft.com` | `rk2.keshavsoft.com.service` | `/root/KeshavSoft/rk2.keshavsoft.com` | `9010` |
| `keshavsoft.com` | `keshavsoft.com.service` | `/root/KeshavSoft/keshavsoft.com` | `9328` |

### Why `ubuntu-service-cli` Was Born
When you host 5, 10, or 20 domains on a server, returning months later creates cognitive load:
- *Which services are currently installed?*
- *What internal port is assigned to each service?*
- *If I have an array of domains in my projects, which ones have systemd services created and which are missing?*
- *How do I create a new service unit without copy-paste mistakes?*

**`ubuntu-service-cli` answers all of these questions in under 1 second.**

---

## ⚡ Quick Start

Run directly via `npx` (no installation required):

```bash
# On your Ubuntu VPS (scans /etc/systemd/system automatically)
npx ubuntu-service-cli

# Check an array of subdomains to find missing services
npx ubuntu-service-cli check appointment.keshavsoft.com lab14.keshavsoft.com newapp.keshavsoft.com

# Inspect port assignments
npx ubuntu-service-cli -p
```

Or install globally:

```bash
npm install -g ubuntu-service-cli
```

---

## 🛠️ CLI Commands & Examples

### 1. Tabular Service List (Default)
Scans `/etc/systemd/system/` (or any custom directory) and prints a clean overview table:

```bash
npx ubuntu-service-cli
```

```
Ubuntu Systemd Services (6 services in /etc/systemd/system):

┌─────────┬──────────────────────────────┬────────┬──────────────────────────────────────┬──────────┬─────────────────────────────────────────┐
│ (index) │ Domain                       │ Port   │ Service                              │ Status   │ Working Directory                       │
├─────────┼──────────────────────────────┼────────┼──────────────────────────────────────┼──────────┼─────────────────────────────────────────┤
│ 0       │ 'appointment.keshavsoft.com' │ '3000' │ 'appointment.keshavsoft.com.service' │ 'active' │ '/root/KeshavSoft/appointment-notifier' │
│ 1       │ 'keshavsoft.com'             │ '9328' │ 'keshavsoft.com.service'             │ 'active' │ '/root/KeshavSoft/keshavsoft.com'       │
│ 2       │ 'lab14.keshavsoft.com'       │ '9012' │ 'lab14.keshavsoft.com.service'       │ 'active' │ '/root/KeshavSoft/lab14.keshavsoft.com' │
│ 3       │ 'mani3.keshavsoft.com'       │ '3025' │ 'mani3.keshavsoft.com.service'       │ 'active' │ '/root/KeshavSoft/mani3.keshavsoft.com' │
│ 4       │ 'quotation.keshavsoft.com'   │ '9011' │ 'quotation.keshavsoft.com.service'   │ 'active' │ '/root/KeshavSoft/quotation.keshavsoft' │
│ 5       │ 'rk2.keshavsoft.com'         │ '9010' │ 'rk2.keshavsoft.com.service'         │ 'active' │ '/root/KeshavSoft/rk2.keshavsoft.com'   │
└─────────┴──────────────────────────────┴────────┴──────────────────────────────────────┴──────────┴─────────────────────────────────────────┘
```

---

### 2. Check Subdomain Availability (`check`)
Pass any array of subdomain strings. The tool cross-references them against active service units and outputs a clear checklist:

```bash
npx ubuntu-service-cli check appointment.keshavsoft.com lab14.keshavsoft.com newbilling.keshavsoft.com
```

```
Ubuntu Systemd Service Checklist (Directory: /etc/systemd/system):

┌─────────┬──────────────┬──────────────────────────────┬──────────────────────────────────────┬────────┬───────────────┬─────────────────────────────────────────┐
│ (index) │ Check        │ Domain                       │ Service File                         │ Port   │ Status        │ Working Directory                       │
├─────────┼──────────────┼──────────────────────────────┼──────────────────────────────────────┼────────┼───────────────┼─────────────────────────────────────────┤
│ 0       │ '✅ Present' │ 'appointment.keshavsoft.com' │ 'appointment.keshavsoft.com.service' │ '3000' │ 'active'      │ '/root/KeshavSoft/appointment-notifier' │
│ 1       │ '✅ Present' │ 'lab14.keshavsoft.com'       │ 'lab14.keshavsoft.com.service'       │ '9012' │ 'active'      │ '/root/KeshavSoft/lab14.keshavsoft.com' │
│ 2       │ '❌ MISSING' │ 'newbilling.keshavsoft.com'  │ 'newbilling.keshavsoft.com.service'  │ '-'    │ 'not_created' │ '-'                                     │
└─────────┴──────────────┴──────────────────────────────┴──────────────────────────────────────┴────────┴───────────────┴─────────────────────────────────────────┘

Summary: 2 present, 1 missing out of 3 checked.
```

> **CI/CD Integration**: Exits with code `0` if all domains are present, or code `2` if any domain is missing. Perfect for deployment validation scripts!

---

### 3. Port Assignments (`-p` or `ports`)
Extracts and lists all internal listening ports across services. Directly matches the output of `npx caddy-cli -p` to verify end-to-end alignment:

```bash
npx ubuntu-service-cli -p
```

```
Ubuntu Systemd Port Mappings (6 services):

┌─────────┬────────┬──────────────────────────────┬──────────────────────────────────────┬──────────┬─────────────────────────────────────────┐
│ (index) │ Port   │ Domain                       │ Service                              │ Status   │ Working Directory                       │
├─────────┼────────┼──────────────────────────────┼──────────────────────────────────────┼──────────┼─────────────────────────────────────────┤
│ 0       │ '3000' │ 'appointment.keshavsoft.com' │ 'appointment.keshavsoft.com.service' │ 'active' │ '/root/KeshavSoft/appointment-notifier' │
│ 1       │ '9328' │ 'keshavsoft.com'             │ 'keshavsoft.com.service'             │ 'active' │ '/root/KeshavSoft/keshavsoft.com'       │
│ 2       │ '9012' │ 'lab14.keshavsoft.com'       │ 'lab14.keshavsoft.com.service'       │ 'active' │ '/root/KeshavSoft/lab14.keshavsoft.com' │
│ 3       │ '3025' │ 'mani3.keshavsoft.com'       │ 'mani3.keshavsoft.com.service'       │ 'active' │ '/root/KeshavSoft/mani3.keshavsoft.com' │
│ 4       │ '9011' │ 'quotation.keshavsoft.com'   │ 'quotation.keshavsoft.com.service'   │ 'active' │ '/root/KeshavSoft/quotation.keshavsoft' │
│ 5       │ '9010' │ 'rk2.keshavsoft.com'         │ 'rk2.keshavsoft.com.service'         │ 'active' │ '/root/KeshavSoft/rk2.keshavsoft.com'   │
└─────────┴────────┴──────────────────────────────┴──────────────────────────────────────┴──────────┴─────────────────────────────────────────┘
```

---

### 4. Deep Inspection of a Specific Service (`-d` or `inspect`)
Inspect the raw section breakdown of any single service unit:

```bash
npx ubuntu-service-cli -d appointment.keshavsoft.com
```

Outputs formatted metadata plus the parsed raw INI sections:
```json
{
  "Unit": {
    "Description": "appointment.keshavsoft.com Node Service",
    "After": "network.target"
  },
  "Service": {
    "Type": "simple",
    "User": "root",
    "WorkingDirectory": "/root/KeshavSoft/appointment-notifier",
    "Environment": [
      "NODE_ENV=production",
      "PORT=3000"
    ],
    "EnvironmentFile": "/root/KeshavSoft/appointment-notifier/.env",
    "ExecStart": "/root/.nvm/versions/node/v24.13.0/bin/node app.js",
    "Restart": "on-failure",
    "RestartSec": "5",
    "StandardOutput": "journal",
    "StandardError": "journal"
  },
  "Install": {
    "WantedBy": "multi-user.target"
  }
}
```

---

### 5. Generate a New Systemd Unit (`generate`)
Generate standard KeshavSoft systemd unit file content to stdout:

```bash
npx ubuntu-service-cli generate appointment.keshavsoft.com 3000 /root/KeshavSoft/appointment-notifier
```

To write directly on the server:
```bash
npx ubuntu-service-cli generate appointment.keshavsoft.com 3000 /root/KeshavSoft/appointment-notifier > /etc/systemd/system/appointment.keshavsoft.com.service
systemctl daemon-reload
systemctl enable --now appointment.keshavsoft.com.service
```

---

## 💻 Programmatic JavaScript API

`ubuntu-service-cli` exports both modern ES Modules and versioned entry points (`ubuntu-service-cli/v1`):

```javascript
import {
    checkServices,
    listServices,
    findServiceByDomain,
    generateServiceUnit
} from "ubuntu-service-cli";

// 1. Check an array of domain strings
const check = checkServices([
    "appointment.keshavsoft.com",
    "lab14.keshavsoft.com",
    "unregistered.keshavsoft.com"
]);

console.log(check.presentCount); // 2
console.log(check.missingCount); // 1
console.log(check.missing[0].domain); // 'unregistered.keshavsoft.com'

// 2. Find a specific service
const svc = findServiceByDomain("appointment.keshavsoft.com");
console.log(svc.port);             // '3000'
console.log(svc.workingDirectory); // '/root/KeshavSoft/appointment-notifier'
console.log(svc.status);           // 'active'

// 3. Generate unit text
const unitText = generateServiceUnit({
    domain: "billing.keshavsoft.com",
    port: 3050,
    workingDirectory: "/root/KeshavSoft/billing"
});
```

---

## 🏆 Why Native Systemd Beats PM2 and Docker

| Feature | Native Systemd (`ubuntu-service-cli`) | PM2 | Docker / Containers |
| :--- | :--- | :--- | :--- |
| **RAM Overhead** | **0 MB** (Kernel process supervisor) | ~50-80 MB daemon | ~150-300 MB runtime |
| **Crash Recovery** | `Restart=on-failure` (5s revive) | Built-in restart | Container restart policy |
| **Boot Persistence** | `systemctl enable` (Native Linux boot) | Requires `pm2 startup` + `pm2 save` | Docker daemon dependency |
| **Log Management** | `journalctl -u <domain>.service -f` | Custom log files (risk disk full) | Docker logs driver |
| **Security & Permissions** | Native OS user isolation (`User=root`) | Node process context | Daemon socket privileges |
| **Dependencies** | **Zero npm packages required** | 30+ npm dependencies | Engine, daemon, compose |

---

## 🪶 Zero Dependencies

`ubuntu-service-cli` is engineered with **zero external npm runtime dependencies**. It relies exclusively on native Node.js core modules:
- `node:fs`
- `node:path`
- `node:child_process`

It runs seamlessly cross-platform on **Ubuntu Linux** (reading `/etc/systemd/system/`) and on **Windows/macOS** (reading custom directories or mock fixtures for local testing).

---

## 🧪 Testing

Run the native Node.js test runner:

```bash
npm test
```

All 8 native unit tests run and pass in under 200ms.

---

## 📄 License

ISC © [KeshavSoft](https://github.com/keshavsoft)
