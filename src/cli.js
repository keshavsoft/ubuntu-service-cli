import path from "node:path";
import {
    listServices,
    checkServices,
    findServiceByDomain,
    resolveSystemdDir,
    generateServiceUnit
} from "./index.js";

export function printHelp() {
    console.log(`
ubuntu-service-cli — Inspect, check, and manage Ubuntu systemd services

Usage:
  npx ubuntu-service-cli [dir] [flags]
  npx ubuntu-service-cli check <domains...> [--dir <dir>] [flags]
  npx ubuntu-service-cli inspect <domain> [--dir <dir>] [flags]
  npx ubuntu-service-cli ports [--dir <dir>] [flags]
  npx ubuntu-service-cli generate <domain> <port> [workingDir] [flags]

Commands:
  (default)            List all systemd services in a formatted table
  check <domains...>   Check an array of domain strings for presence/absence
  inspect <domain>     Deeply inspect a specific service unit file (-d)
  ports                List all extracted port assignments (-p)
  generate <domain>    Generate a standard KeshavSoft systemd .service unit

Options:
  --dir <path>         Target directory (defaults to /etc/systemd/system)
  -p, --ports          Shortcut for 'ports' command
  -d, --domain <name>  Shortcut for 'inspect <name>'
  --json               Output machine-readable JSON
  -h, --help           Show this help message

Examples:
  npx ubuntu-service-cli
  npx ubuntu-service-cli check appointment.keshavsoft.com lab14.keshavsoft.com newapp.keshavsoft.com
  npx ubuntu-service-cli -d appointment.keshavsoft.com
  npx ubuntu-service-cli -p
  npx ubuntu-service-cli generate appointment.keshavsoft.com 3000 /root/KeshavSoft/appointment-notifier
`);
}

export function runCli(argv = process.argv.slice(2)) {
    const isJson = argv.includes("--json");
    const isHelp = argv.includes("-h") || argv.includes("--help");

    if (isHelp) {
        printHelp();
        return 0;
    }

    // Extract --dir flag
    let customDir = null;
    const dirIdx = argv.indexOf("--dir");
    if (dirIdx !== -1 && argv[dirIdx + 1]) {
        customDir = argv[dirIdx + 1];
    }

    // Filter out flags from positional arguments
    const args = argv.filter((arg, i) => {
        if (arg === "--json" || arg === "-h" || arg === "--help" || arg === "-p" || arg === "--ports") return false;
        if (arg === "--dir" || (i > 0 && argv[i - 1] === "--dir")) return false;
        if (arg === "-d" || (i > 0 && argv[i - 1] === "-d")) return false;
        return true;
    });

    const command = args[0] ? args[0].toLowerCase() : "";

    // 1. Ports command (-p or 'ports')
    if (argv.includes("-p") || argv.includes("--ports") || command === "ports") {
        const services = listServices({ dir: customDir });
        const portRows = services.map(s => ({
            "Port": s.port,
            "Domain": s.domain,
            "Service": s.serviceName,
            "Status": s.status,
            "Working Directory": s.workingDirectory
        }));

        if (isJson) {
            console.log(JSON.stringify(portRows, null, 2));
            return 0;
        }

        console.log(`\nUbuntu Systemd Port Mappings (${portRows.length} services):\n`);
        console.table(portRows);
        return 0;
    }

    // 2. Inspect command (-d or 'inspect')
    let inspectDomain = null;
    const dIdx = argv.indexOf("-d");
    if (dIdx !== -1 && argv[dIdx + 1]) {
        inspectDomain = argv[dIdx + 1];
    } else if (command === "inspect" && args[1]) {
        inspectDomain = args[1];
    }

    if (inspectDomain) {
        const svc = findServiceByDomain(inspectDomain, { dir: customDir });
        if (!svc) {
            console.error(`Error: Service for domain '${inspectDomain}' not found.`);
            return 1;
        }

        if (isJson) {
            console.log(JSON.stringify(svc, null, 2));
            return 0;
        }

        console.log(`\n======================================================`);
        console.log(` Systemd Service: ${svc.serviceName}`);
        console.log(` Path: ${svc.filePath}`);
        console.log(` Status: ${svc.status}`);
        console.log(`======================================================\n`);

        console.table([{
            "Domain": svc.domain,
            "Port": svc.port,
            "User": svc.user,
            "Restart": `${svc.restart} (${svc.restartSec}s)`,
            "Working Directory": svc.workingDirectory,
            "ExecStart": svc.execStart
        }]);

        console.log("\nRaw Unit Sections:\n");
        console.log(JSON.stringify(svc.raw, null, 2));
        return 0;
    }

    // 3. Check command ('check' <domains...>)
    if (command === "check") {
        const domainArgs = args.slice(1);
        if (domainArgs.length === 0) {
            console.error("Error: 'check' command requires at least one domain to check.");
            console.error("Example: npx ubuntu-service-cli check appointment.keshavsoft.com lab14.keshavsoft.com");
            return 1;
        }

        const result = checkServices(domainArgs, { dir: customDir });

        if (isJson) {
            console.log(JSON.stringify(result, null, 2));
            return result.missingCount === 0 ? 0 : 2;
        }

        console.log(`\nUbuntu Systemd Service Checklist (Directory: ${result.dir}):\n`);

        const rows = [
            ...result.present.map(p => ({
                "Check": "✅ Present",
                "Domain": p.domain,
                "Service File": p.serviceName,
                "Port": p.port,
                "Status": p.status,
                "Working Directory": p.workingDirectory
            })),
            ...result.missing.map(m => ({
                "Check": "❌ MISSING",
                "Domain": m.domain,
                "Service File": m.expectedServiceName,
                "Port": "-",
                "Status": "not_created",
                "Working Directory": "-"
            }))
        ];

        console.table(rows);
        console.log(`\nSummary: ${result.presentCount} present, ${result.missingCount} missing out of ${result.totalChecked} checked.`);

        return result.missingCount === 0 ? 0 : 2;
    }

    // 4. Generate command ('generate' <domain> <port> [workingDir])
    if (command === "generate") {
        const domain = args[1];
        const port = args[2];
        const workingDir = args[3];

        if (!domain || !port) {
            console.error("Error: 'generate' requires <domain> and <port>.");
            console.error("Example: npx ubuntu-service-cli generate appointment.keshavsoft.com 3000");
            return 1;
        }

        const unitText = generateServiceUnit({
            domain,
            port,
            workingDirectory: workingDir
        });

        console.log(unitText);
        return 0;
    }

    // 5. Default: List all services
    // If first argument is a directory path, use it
    if (command && !customDir) {
        customDir = command;
    }

    const services = listServices({ dir: customDir });

    if (isJson) {
        console.log(JSON.stringify(services, null, 2));
        return 0;
    }

    const targetDir = resolveSystemdDir(customDir);
    console.log(`\nUbuntu Systemd Services (${services.length} services in ${targetDir}):\n`);

    const tableRows = services.map(s => ({
        "Domain": s.domain,
        "Port": s.port,
        "Service": s.serviceName,
        "Status": s.status,
        "Working Directory": s.workingDirectory,
        "ExecStart": s.execStart
    }));

    console.table(tableRows);
    console.log(`Tip: Run 'npx ubuntu-service-cli check <domain1> <domain2>' to check subdomains.`);
    console.log(`     Run 'npx ubuntu-service-cli -p' to see port assignments.`);
    console.log(`     Run 'npx ubuntu-service-cli -d <domain>' to inspect a specific service.`);

    return 0;
}

