# ubuntu-service-cli

> **Inspect, check, and manage Ubuntu systemd services matching KeshavSoft VPS domain conventions.**

Part of the **KeshavSoft VPS Management Suite**:
- **[`caddy-cli`](../caddy-cli)**: Manages reverse proxy routes, ports, and domains in `/etc/caddy/caddy.json`.
- **`ubuntu-service-cli`**: Manages backend Node.js systemd service units in `/etc/systemd/system/`.

---

## Features

- 📋 **Tabular Service View**: Lists all systemd services in a formatted table showing Domain, Port, Service Name, Working Directory, and ExecStart.
- ✅ **Domain Checklist**: Pass an array of subdomains (e.g. `['appointment.keshavsoft.com', 'lab14.keshavsoft.com']`) to instantly verify which services are configured and which are missing.
- 🔌 **Port Mapping Inspection**: Quick view of ports extracted from `Environment=PORT=...` lines across all services (`-p`).
- 🔍 **Deep Inspection**: Inspect single service units (`-d <domain>`) with raw section breakdown.
- ⚙️ **Unit Generator**: Generates clean, standard KeshavSoft systemd `.service` files with `Restart=on-failure`, `After=network.target`, and journal logging.
- 🪶 **Zero Dependencies**: Pure Node.js built-ins (`node:fs`, `node:path`, `node:child_process`). Runs cross-platform on Linux and Windows.

---

## Installation & Quick Run

Run directly via `npx`:

```bash
# On your Ubuntu VPS
npx ubuntu-service-cli

# Or check specific subdomains
npx ubuntu-service-cli check appointment.keshavsoft.com lab14.keshavsoft.com newapp.keshavsoft.com
```

Or install globally:

```bash
npm install -g ubuntu-service-cli
```

---

## CLI Usage

### 1. List All Services (Default)
Scans `/etc/systemd/system/` (or a specified directory) and prints a formatted table:

```bash
npx ubuntu-service-cli
```

**Output:**
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

### 2. Check Subdomain Availability (`check`)
Supply an array of domain strings to see which ones have corresponding systemd services and which are missing:

```bash
npx ubuntu-service-cli check appointment.keshavsoft.com lab14.keshavsoft.com newservice.keshavsoft.com
```

**Output:**
```
┌─────────┬──────────────┬──────────────────────────────┬──────────────────────────────────────┬────────┬───────────────┐
│ (index) │ Check        │ Domain                       │ Service File                         │ Port   │ Status        │
├─────────┼──────────────┼──────────────────────────────┼──────────────────────────────────────┼────────┼───────────────┤
│ 0       │ '✅ Present' │ 'appointment.keshavsoft.com' │ 'appointment.keshavsoft.com.service' │ '3000' │ 'active'      │
│ 1       │ '✅ Present' │ 'lab14.keshavsoft.com'       │ 'lab14.keshavsoft.com.service'       │ '9012' │ 'active'      │
│ 2       │ '❌ MISSING' │ 'newservice.keshavsoft.com'  │ 'newservice.keshavsoft.com.service'  │ '-'    │ 'not_created' │
└─────────┴──────────────┴──────────────────────────────┴──────────────────────────────────────┴────────┴───────────────┘

Summary: 2 present, 1 missing out of 3 checked.
```

### 3. Port Assignments (`-p` / `ports`)
Extract and display all port assignments:

```bash
npx ubuntu-service-cli -p
```

### 4. Inspect a Specific Service (`-d` / `inspect`)
Deep inspection of an individual service unit file:

```bash
npx ubuntu-service-cli -d appointment.keshavsoft.com
```

### 5. Generate a New Systemd Unit (`generate`)
Generate standard unit file content to stdout (ready to pipe or copy):

```bash
npx ubuntu-service-cli generate appointment.keshavsoft.com 3000 /root/KeshavSoft/appointment-notifier
```

---

## Programmatic API

You can also import `ubuntu-service-cli` in your Node.js scripts:

```javascript
import { listServices, checkServices, findServiceByDomain, generateServiceUnit } from "ubuntu-service-cli";

// 1. Check an array of domain strings
const result = checkServices([
    "appointment.keshavsoft.com",
    "lab14.keshavsoft.com",
    "unregistered.keshavsoft.com"
]);

console.log(result.present); // Array of present services with ports & paths
console.log(result.missing); // Array of missing domains

// 2. Find a specific service
const service = findServiceByDomain("appointment.keshavsoft.com");
console.log(service.port);             // '3000'
console.log(service.workingDirectory); // '/root/KeshavSoft/appointment-notifier'

// 3. Generate unit file content
const unitText = generateServiceUnit({
    domain: "billing.keshavsoft.com",
    port: 3050,
    workingDirectory: "/root/KeshavSoft/billing"
});
```

---

## Testing

Run the native Node.js test suite:

```bash
npm test
```

---

## License

ISC © KeshavSoft

