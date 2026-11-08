import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { parseIni, extractPortFromUnit, generateServiceUnit } from "./parser.js";

export const DEFAULT_SYSTEMD_PATH = "/etc/systemd/system";

/**
 * Resolves the systemd directory to inspect.
 */
export function resolveSystemdDir(customDir) {
    if (customDir) {
        return path.resolve(customDir);
    }
    if (fs.existsSync(DEFAULT_SYSTEMD_PATH)) {
        return DEFAULT_SYSTEMD_PATH;
    }
    // Fallback if running locally in workspace and a test fixtures dir exists
    const localFixtures = path.resolve("./test/fixtures");
    if (fs.existsSync(localFixtures)) {
        return localFixtures;
    }
    return DEFAULT_SYSTEMD_PATH;
}

/**
 * Gets live status of a systemd service if systemctl is available.
 */
export function getServiceStatus(serviceName) {
    if (process.platform !== "linux") {
        return "configured";
    }
    try {
        const out = execSync(`systemctl is-active ${serviceName} 2>/dev/null`, {
            encoding: "utf8",
            timeout: 2000
        }).trim();
        return out || "inactive";
    } catch (error) {
        // systemctl exits non-zero if inactive, failed, etc.
        const stdout = error.stdout ? error.stdout.toString().trim() : "";
        return stdout || "inactive";
    }
}

/**
 * Parses a single .service file into a structured object.
 */
export function parseServiceFile(filePath) {
    const rawContent = fs.readFileSync(filePath, "utf8");
    const parsed = parseIni(rawContent);
    const fileName = path.basename(filePath);
    const domain = fileName.replace(/\.service$/i, "");
    const port = extractPortFromUnit(parsed);

    const serviceSection = parsed.Service || {};
    const unitSection = parsed.Unit || {};

    return {
        serviceName: fileName,
        domain,
        filePath,
        port: port || "-",
        description: unitSection.Description || "",
        workingDirectory: serviceSection.WorkingDirectory || "-",
        execStart: serviceSection.ExecStart || "-",
        user: serviceSection.User || "root",
        restart: serviceSection.Restart || "-",
        restartSec: serviceSection.RestartSec || "-",
        environment: serviceSection.Environment || [],
        environmentFile: serviceSection.EnvironmentFile || "-",
        status: getServiceStatus(fileName),
        raw: parsed
    };
}

/**
 * Lists all .service files in the target directory.
 */
export function listServices(options = {}) {
    const dir = resolveSystemdDir(options.dir);

    if (!fs.existsSync(dir)) {
        throw new Error(`Systemd directory not found at: ${dir}`);
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith(".service"));
    const services = [];

    for (const file of files) {
        if (options.keshavsoftOnly) {
            if (!file.includes("keshavsoft.com")) continue;
        }
        if (options.pattern) {
            const re = typeof options.pattern === "string" ? new RegExp(options.pattern, "i") : options.pattern;
            if (!re.test(file)) continue;
        }

        try {
            const parsed = parseServiceFile(path.join(dir, file));
            services.push(parsed);
        } catch {
            // Skip unparseable files
        }
    }

    return services;
}

/**
 * Checks an array of domain strings against existing systemd services.
 * Identifies which subdomains are active/present and which are missing.
 *
 * @param {string|string[]} domains - Single domain or array of domain strings
 * @param {object} options - Optional { dir }
 * @returns {object} { dir, totalChecked, presentCount, missingCount, present: [], missing: [] }
 */
export function checkServices(domains, options = {}) {
    const domainList = Array.isArray(domains) ? domains : [domains];
    const cleanList = domainList.map(d => String(d).trim().toLowerCase()).filter(Boolean);

    const allServices = listServices(options);
    const serviceMap = new Map();

    for (const svc of allServices) {
        serviceMap.set(svc.domain.toLowerCase(), svc);
        serviceMap.set(svc.serviceName.toLowerCase(), svc);
    }

    const present = [];
    const missing = [];
    const dir = resolveSystemdDir(options.dir);

    for (const rawDomain of cleanList) {
        const domain = rawDomain.replace(/\.service$/i, "");
        const serviceName = `${domain}.service`;

        if (serviceMap.has(domain) || serviceMap.has(serviceName)) {
            const svc = serviceMap.get(domain) || serviceMap.get(serviceName);
            present.push({
                domain,
                serviceName: svc.serviceName,
                filePath: svc.filePath,
                port: svc.port,
                workingDirectory: svc.workingDirectory,
                execStart: svc.execStart,
                status: svc.status
            });
        } else {
            missing.push({
                domain,
                expectedServiceName: serviceName,
                expectedPath: path.join(dir, serviceName)
            });
        }
    }

    return {
        dir,
        totalChecked: cleanList.length,
        presentCount: present.length,
        missingCount: missing.length,
        present,
        missing
    };
}

/**
 * Finds a single service by domain or service name.
 */
export function findServiceByDomain(domain, options = {}) {
    if (!domain) return null;
    const clean = String(domain).trim().toLowerCase().replace(/\.service$/i, "");
    const services = listServices(options);
    return services.find(s => s.domain.toLowerCase() === clean || s.serviceName.toLowerCase() === `${clean}.service`) || null;
}

listServices.listServices = listServices;
listServices.checkServices = checkServices;
listServices.findServiceByDomain = findServiceByDomain;
listServices.parseServiceFile = parseServiceFile;
listServices.resolveSystemdDir = resolveSystemdDir;
listServices.getServiceStatus = getServiceStatus;
listServices.parseIni = parseIni;
listServices.extractPortFromUnit = extractPortFromUnit;
listServices.generateServiceUnit = generateServiceUnit;

export default listServices;
export { parseIni, extractPortFromUnit, generateServiceUnit };
