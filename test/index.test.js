import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    parseIni,
    extractPortFromUnit,
    generateServiceUnit,
    listServices,
    checkServices,
    findServiceByDomain,
    parseServiceFile
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("parseIni correctly parses unit sections and multiple environments", () => {
    const raw = `
    [Unit]
    Description=My Service
    # comment
    After=network.target

    [Service]
    Type=simple
    Environment=NODE_ENV=production
    Environment=PORT=3000
    ExecStart=/usr/bin/node app.js
    `;

    const parsed = parseIni(raw);
    assert.equal(parsed.Unit.Description, "My Service");
    assert.equal(parsed.Unit.After, "network.target");
    assert.equal(parsed.Service.Type, "simple");
    assert.deepEqual(parsed.Service.Environment, ["NODE_ENV=production", "PORT=3000"]);
    assert.equal(parsed.Service.ExecStart, "/usr/bin/node app.js");
});

test("extractPortFromUnit extracts PORT from Environment and ExecStart", () => {
    const unitWithEnv = {
        Service: {
            Environment: ["NODE_ENV=production", "PORT=8080"]
        }
    };
    assert.equal(extractPortFromUnit(unitWithEnv), "8080");

    const unitWithExec = {
        Service: {
            ExecStart: "/usr/bin/node app.js --port 9011"
        }
    };
    assert.equal(extractPortFromUnit(unitWithExec), "9011");
});

test("generateServiceUnit generates valid KeshavSoft systemd unit text", () => {
    const unitText = generateServiceUnit({
        domain: "appointment.keshavsoft.com",
        port: 3000,
        workingDirectory: "/root/KeshavSoft/appointment-notifier"
    });

    assert.match(unitText, /\[Unit\]/);
    assert.match(unitText, /Description=appointment\.keshavsoft\.com Node Service/);
    assert.match(unitText, /WorkingDirectory=\/root\/KeshavSoft\/appointment-notifier/);
    assert.match(unitText, /Environment=PORT=3000/);
    assert.match(unitText, /Restart=on-failure/);
    assert.match(unitText, /WantedBy=multi-user\.target/);
});

test("parseServiceFile parses fixture file with complete metadata", () => {
    const filePath = path.join(fixturesDir, "appointment.keshavsoft.com.service");
    const svc = parseServiceFile(filePath);

    assert.equal(svc.domain, "appointment.keshavsoft.com");
    assert.equal(svc.serviceName, "appointment.keshavsoft.com.service");
    assert.equal(svc.port, "3000");
    assert.equal(svc.workingDirectory, "/root/KeshavSoft/appointment-notifier");
    assert.equal(svc.user, "root");
    assert.equal(svc.restart, "on-failure");
});

test("listServices finds all fixtures in test directory", () => {
    const services = listServices({ dir: fixturesDir });
    assert.equal(services.length, 6);

    const domains = services.map(s => s.domain).sort();
    assert.deepEqual(domains, [
        "appointment.keshavsoft.com",
        "keshavsoft.com",
        "lab14.keshavsoft.com",
        "mani3.keshavsoft.com",
        "quotation.keshavsoft.com",
        "rk2.keshavsoft.com"
    ]);
});

test("findServiceByDomain finds service case-insensitively and with/without .service", () => {
    const found1 = findServiceByDomain("appointment.keshavsoft.com", { dir: fixturesDir });
    assert.ok(found1);
    assert.equal(found1.port, "3000");

    const found2 = findServiceByDomain("APPOINTMENT.KESHAVSOFT.COM.SERVICE", { dir: fixturesDir });
    assert.ok(found2);
    assert.equal(found2.domain, "appointment.keshavsoft.com");

    const notFound = findServiceByDomain("nonexistent.keshavsoft.com", { dir: fixturesDir });
    assert.equal(notFound, null);
});

test("checkServices correctly identifies present and missing subdomains", () => {
    const checkList = [
        "appointment.keshavsoft.com",
        "mani3.keshavsoft.com",
        "nonexistent.keshavsoft.com",
        "lab14.keshavsoft.com.service",
        "random.example.com"
    ];

    const result = checkServices(checkList, { dir: fixturesDir });

    assert.equal(result.totalChecked, 5);
    assert.equal(result.presentCount, 3);
    assert.equal(result.missingCount, 2);

    const presentDomains = result.present.map(p => p.domain).sort();
    assert.deepEqual(presentDomains, [
        "appointment.keshavsoft.com",
        "lab14.keshavsoft.com",
        "mani3.keshavsoft.com"
    ]);

    const missingDomains = result.missing.map(m => m.domain).sort();
    assert.deepEqual(missingDomains, [
        "nonexistent.keshavsoft.com",
        "random.example.com"
    ]);

    // Check detailed metadata in present items
    const appt = result.present.find(p => p.domain === "appointment.keshavsoft.com");
    assert.equal(appt.port, "3000");
    assert.equal(appt.workingDirectory, "/root/KeshavSoft/appointment-notifier");
});

