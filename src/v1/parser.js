/**
 * INI / Systemd unit file parser and generator.
 * Zero external dependencies.
 */

export function parseIni(content) {
    const lines = content.split(/\r?\n/);
    const sections = {};
    let currentSection = null;

    for (let rawLine of lines) {
        const line = rawLine.trim();

        // Skip comments and empty lines
        if (!line || line.startsWith("#") || line.startsWith(";")) {
            continue;
        }

        // Section header: [Unit], [Service], [Install]
        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].trim();
            if (!sections[currentSection]) {
                sections[currentSection] = {};
            }
            continue;
        }

        // Key = Value
        const eqIdx = line.indexOf("=");
        if (eqIdx !== -1 && currentSection) {
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();

            const existing = sections[currentSection][key];
            if (existing !== undefined) {
                // If a key appears multiple times (like Environment=), store as array
                if (Array.isArray(existing)) {
                    existing.push(value);
                } else {
                    sections[currentSection][key] = [existing, value];
                }
            } else {
                sections[currentSection][key] = value;
            }
        }
    }

    return sections;
}

export function extractPortFromUnit(unit) {
    if (!unit || !unit.Service) return null;

    const envs = [];
    const envVal = unit.Service.Environment;
    if (Array.isArray(envVal)) {
        envs.push(...envVal);
    } else if (typeof envVal === "string") {
        envs.push(envVal);
    }

    for (const env of envs) {
        const match = env.match(/\bPORT\s*=\s*(\d{2,5})\b/i);
        if (match) {
            return match[1];
        }
    }

    // Check ExecStart for port arguments (e.g. PORT=3000 node ... or --port 3000)
    const execStart = unit.Service.ExecStart || "";
    const execPortMatch = execStart.match(/(?:PORT\s*=\s*|--port(?:=|\s+))(\d{2,5})/i);
    if (execPortMatch) {
        return execPortMatch[1];
    }

    return null;
}

export function generateServiceUnit({
    domain,
    port,
    workingDirectory,
    execStart = "/root/.nvm/versions/node/v24.13.0/bin/node app.js",
    user = "root",
    nodeEnv = "production",
    restartSec = 5,
    description
}) {
    if (!domain) {
        throw new Error("generateServiceUnit requires a domain string.");
    }
    const cleanDomain = domain.replace(/\.service$/i, "").trim();
    const serviceDescription = description || `${cleanDomain} Node Service`;
    const cleanWorkingDir = workingDirectory || `/root/KeshavSoft/${cleanDomain}`;

    const lines = [
        "[Unit]",
        `Description=${serviceDescription}`,
        "After=network.target",
        "",
        "[Service]",
        "Type=simple",
        `User=${user}`,
        `WorkingDirectory=${cleanWorkingDir}`,
        "",
        `Environment=NODE_ENV=${nodeEnv}`
    ];

    if (port) {
        lines.push(`Environment=PORT=${port}`);
    }

    lines.push(
        `EnvironmentFile=${cleanWorkingDir}/.env`,
        "",
        `ExecStart=${execStart}`,
        "",
        "Restart=on-failure",
        `RestartSec=${restartSec}`,
        "",
        "StandardOutput=journal",
        "StandardError=journal",
        "",
        "[Install]",
        "WantedBy=multi-user.target"
    );

    return lines.join("\n") + "\n";
}
