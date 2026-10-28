#!/usr/bin/env node
/**
 * OLD MONK Mission Control — Hardware Telemetry Bridge
 *
 * Pipeline:
 *   ESP32 Sensors -> ESP-NOW -> ESP8266 Receiver -> Serial (COM) -> bridge.js -> WebSocket -> Dashboard
 *
 * Usage:
 *   node bridge.js [--port 8081] [--serial COM3] [--baud 115200]
 *
 * Environment variables:
 *   PORT=8081
 *   SERIAL_PORT=COM3
 *   BAUD_RATE=115200
 *   SIMULATOR_FALLBACK=true (only generates fallback packets if no real serial port is open)
 */

import http from "node:http";
import crypto from "node:crypto";
import readline from "node:readline";

const WS_PORT = parseInt(process.env.PORT || getArg("--port") || "8081", 10);
const SERIAL_PORT = process.env.SERIAL_PORT || getArg("--serial") || null;
const BAUD_RATE = parseInt(process.env.BAUD_RATE || getArg("--baud") || "115200", 10);
const SIMULATOR_FALLBACK = (process.env.SIMULATOR_FALLBACK ?? "true") !== "false";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : null;
}

console.log("\n=======================================================");
console.log("  OLD MONK / ORBITRA'26 — HARDWARE TELEMETRY BRIDGE");
console.log("=======================================================");
console.log(`  WebSocket Server : ws://localhost:${WS_PORT}`);
console.log(`  Target Serial    : ${SERIAL_PORT || "Auto-detect / Fallback mode"}`);
console.log(`  Baud Rate        : ${BAUD_RATE}`);
console.log(`  Fallback Sim     : ${SIMULATOR_FALLBACK ? "Enabled (if no serial)" : "Disabled"}`);
console.log("=======================================================\n");

// ── WebSocket Server Implementation (Zero-dependency RFC 6455) ───────────────
const clients = new Set();

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        bridge: "online",
        port: WS_PORT,
        clients: clients.size,
        serialPort: SERIAL_PORT,
        uptime: process.uptime(),
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");

  const responseHeaders = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey}`,
    "\r\n",
  ];

  socket.write(responseHeaders.join("\r\n"));

  const client = {
    socket,
    ip: req.socket.remoteAddress,
    alive: true,
  };
  clients.add(client);
  console.log(`[WS] Client connected from ${client.ip} (total: ${clients.size})`);

  // Send greeting & bridge identity
  sendWsText(
    client,
    JSON.stringify({
      type: "heartbeat",
      bridge: "OLD_MONK_BRIDGE_V1",
      version: "1.0.0",
      serialPort: SERIAL_PORT || "NONE",
      connectedClients: clients.size,
    }),
  );

  socket.on("data", (buffer) => {
    handleWsData(client, buffer);
  });

  socket.on("close", () => {
    clients.delete(client);
    console.log(`[WS] Client disconnected (remaining: ${clients.size})`);
  });

  socket.on("error", (err) => {
    clients.delete(client);
  });
});

function handleWsData(client, buffer) {
  if (buffer.length < 2) return;
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  const opcode = firstByte & 0x0f;

  if (opcode === 0x8) {
    // Close
    client.socket.end();
    return;
  }
  if (opcode === 0x9) {
    // Ping -> Pong
    const pong = Buffer.from([0x8a, 0x00]);
    client.socket.write(pong);
    return;
  }

  const isMasked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2);
    offset += 2;
  } else if (payloadLength === 127) {
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset += 8;
  }

  let payload;
  if (isMasked) {
    const mask = buffer.subarray(offset, offset + 4);
    offset += 4;
    payload = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      payload[i] = buffer[offset + i] ^ mask[i % 4];
    }
  } else {
    payload = buffer.subarray(offset, offset + payloadLength);
  }

  try {
    const msg = payload.toString("utf8");
    const parsed = JSON.parse(msg);
    if (parsed.type === "ping") {
      sendWsText(client, JSON.stringify({ type: "pong", time: Date.now() }));
    }
  } catch {}
}

function sendWsText(client, text) {
  if (!client.socket.writable) return;
  const payload = Buffer.from(text, "utf8");
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  try {
    client.socket.write(Buffer.concat([header, payload]));
  } catch (err) {
    clients.delete(client);
  }
}

export function broadcast(payload) {
  const jsonString = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const client of clients) {
    sendWsText(client, jsonString);
  }
}

// ── Heartbeat Interval (Every 5 seconds) ────────────────────────────────────
setInterval(() => {
  broadcast({
    type: "heartbeat",
    timestamp: Date.now(),
    clients: clients.size,
  });
}, 5000);

// ── Serial / ESP8266 Parser ──────────────────────────────────────────────────
let packetSequence = 1;
let serialConnected = false;

function processRawLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    // Check if it's already JSON
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      broadcast(parsed);
      return;
    }

    // CSV format: OLDMONK,seq,temp,hum,press,alt,ax,ay,az,gx,gy,gz,roll,pitch,yaw,lat,lon,rssi,fix
    if (trimmed.startsWith("OLDMONK,") || trimmed.startsWith("PKT,")) {
      const parts = trimmed.split(",");
      const packet = {
        packetCount: parseInt(parts[1], 10) || packetSequence++,
        temperature: parseFloat(parts[2]) || null,
        humidity: parseFloat(parts[3]) || null,
        pressure: parseFloat(parts[4]) || null,
        altitude: parseFloat(parts[5]) || null,
        accelerationX: parseFloat(parts[6]) || 0,
        accelerationY: parseFloat(parts[7]) || 0,
        accelerationZ: parseFloat(parts[8]) || 1,
        gyroX: parseFloat(parts[9]) || 0,
        gyroY: parseFloat(parts[10]) || 0,
        gyroZ: parseFloat(parts[11]) || 0,
        roll: parseFloat(parts[12]) || 0,
        pitch: parseFloat(parts[13]) || 0,
        yaw: parseFloat(parts[14]) || 0,
        latitude: parseFloat(parts[15]) || null,
        longitude: parseFloat(parts[16]) || null,
        signalStrength: parseInt(parts[17], 10) || -60,
        gpsFix: parts[18] === "1" || parts[18] === "true",
        timestamp: Date.now(),
      };
      broadcast(packet);
      return;
    }
  } catch (err) {
    console.error(`[BRIDGE] Failed to parse serial line: "${trimmed}":`, err.message);
  }
}

// ── Standard Input Reader (Allows piping serial tool like putty/minicom into node bridge.js) ──
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  serialConnected = true;
  processRawLine(line);
});

// ── Realistic Fallback Simulator (Runs only if real serial link is idle) ──────
if (SIMULATOR_FALLBACK) {
  let simTime = 0;
  setInterval(() => {
    // If real serial is feeding packets, do not emit fake data
    if (serialConnected) return;
    if (clients.size === 0) return; // Don't churn when no UI connected

    simTime += 1;
    const t = simTime * 0.1;
    const packet = {
      packetCount: packetSequence++,
      timestamp: Date.now(),
      missionTime: simTime,
      temperature: Number((24.2 + Math.sin(t * 0.1) * 2.5).toFixed(2)),
      humidity: Number((48.5 + Math.cos(t * 0.12) * 4.0).toFixed(1)),
      pressure: Number((1012.4 + Math.sin(t * 0.05) * 1.8).toFixed(1)),
      altitude: Number((45.0 + Math.sin(t * 0.05) * 6.0).toFixed(1)),
      accelerationX: Number((0.02 * Math.sin(t * 0.5)).toFixed(3)),
      accelerationY: Number((-0.01 * Math.cos(t * 0.4)).toFixed(3)),
      accelerationZ: Number((0.98 + 0.02 * Math.sin(t * 0.3)).toFixed(3)),
      gyroX: Number((0.4 * Math.sin(t * 0.8)).toFixed(2)),
      gyroY: Number((0.3 * Math.cos(t * 0.6)).toFixed(2)),
      gyroZ: Number((0.1 * Math.sin(t * 0.2)).toFixed(2)),
      roll: Number((8 * Math.sin(t * 0.3)).toFixed(1)),
      pitch: Number((5 * Math.cos(t * 0.25)).toFixed(1)),
      yaw: Number(((t * 8) % 360).toFixed(1)),
      rollRaw: Number((8 * Math.sin(t * 0.3)).toFixed(1)),
      pitchRaw: Number((5 * Math.cos(t * 0.25)).toFixed(1)),
      latitude: Number((28.6139 + Math.sin(t * 0.02) * 0.005).toFixed(5)),
      longitude: Number((77.209 + Math.cos(t * 0.02) * 0.005).toFixed(5)),
      battery: Math.max(10, Number((88 - simTime * 0.005).toFixed(1))),
      charging: true,
      signalStrength: -62 + Math.round(Math.sin(t * 0.5) * 4),
      gpsFix: true,
      connected: true,
    };
    broadcast(packet);
  }, 1000);
}

server.listen(WS_PORT, () => {
  console.log(`[BRIDGE] Telemetry WebSocket server running on port ${WS_PORT}`);
  console.log(`[BRIDGE] Ready to accept telemetry from serial or stdin.\n`);
});
