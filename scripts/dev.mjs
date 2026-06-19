import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const lockPath = path.join(projectRoot, ".next", "dev", "lock");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcess(pid) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process exited between check and kill.
  }
}

function stopExistingDevServer() {
  if (!fs.existsSync(lockPath)) return;

  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch {
    fs.rmSync(lockPath, { force: true });
    return;
  }

  const pid = Number(lock?.pid);
  if (Number.isInteger(pid) && pid > 0 && isProcessRunning(pid)) {
    killProcess(pid);
  }

  fs.rmSync(lockPath, { force: true });
}

stopExistingDevServer();

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
