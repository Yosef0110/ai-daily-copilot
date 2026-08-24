const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";

  const result = spawnSync(checker, [command], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  return result.status === 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

console.log("Starting AI Daily Copilot...\n");

// ============================================================
// ROOT NODE DEPENDENCIES
// ============================================================

if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  console.log("Installing root dependencies...");

  const npmCommand =
    process.platform === "win32" ? "npm.cmd" : "npm";

  run(npmCommand, ["install"]);
} else {
  console.log("Root dependencies already installed.");
}

// ============================================================
// WEB DEPENDENCIES
// ============================================================

if (!fs.existsSync(path.join(ROOT, "web", "node_modules"))) {
  console.log("Installing web dependencies...");

  const npmCommand =
    process.platform === "win32" ? "npm.cmd" : "npm";

  run(npmCommand, ["--prefix", "web", "install"]);
} else {
  console.log("Web dependencies already installed.");
}

// ============================================================
// PYTHON
// ============================================================

const pythonCandidates =
  process.platform === "win32"
    ? ["python", "py"]
    : ["python3", "python"];

let pythonCommand = null;

for (const candidate of pythonCandidates) {
  if (commandExists(candidate)) {
    pythonCommand = candidate;
    break;
  }
}

if (!pythonCommand) {
  console.error("Python tidak ditemukan.");
  console.error(
    "Install Python / aktifkan environment project terlebih dahulu.",
  );
  process.exit(1);
}

console.log(`Using Python command: ${pythonCommand}`);
console.log("Checking Python requirements...");

if (pythonCommand === "py") {
  run("py", [
    "-m",
    "pip",
    "install",
    "-r",
    "ai-service/requirements.txt",
    "--quiet",
  ]);
} else {
  run(pythonCommand, [
    "-m",
    "pip",
    "install",
    "-r",
    "ai-service/requirements.txt",
    "--quiet",
  ]);
}

console.log("Python dependencies ready.");

// ============================================================
// DOCKER
// ============================================================

if (!commandExists("docker")) {
  console.error("Docker CLI tidak ditemukan.");
  console.error("Install Docker Desktop terlebih dahulu.");
  process.exit(1);
}

console.log("Checking Docker...");

const dockerStatus = spawnSync("docker", ["info"], {
  cwd: ROOT,
  stdio: "ignore",
  shell: false,
});

if (dockerStatus.status !== 0) {
  console.error("Docker Desktop belum berjalan.");
  console.error(
    "Jalankan Docker Desktop lalu jalankan npm run dev lagi.",
  );
  process.exit(1);
}

console.log("Docker is running.");

// ============================================================
// SUPABASE
// ============================================================

if (!commandExists("supabase")) {
  console.error("Supabase CLI tidak ditemukan.");
  console.error("Install Supabase CLI terlebih dahulu.");
  process.exit(1);
}

console.log("Checking Supabase...");

const supabaseStatus = spawnSync("supabase", ["status"], {
  cwd: ROOT,
  stdio: "ignore",
  shell: false,
});

if (supabaseStatus.status !== 0) {
  console.log("Supabase is not running. Starting Supabase...");

  run("supabase", ["start"]);
} else {
  console.log("Supabase already running.");
}

// ============================================================
// NEXT.JS + FASTAPI
// ============================================================

console.log("\nStarting Next.js and FastAPI...\n");

const npmCommand =
  process.platform === "win32" ? "npm.cmd" : "npm";

const nextProcess = spawn(
  npmCommand,
  ["--prefix", "web", "run", "dev"],
  {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  },
);

const fastApiArgs =
  pythonCommand === "py"
    ? [
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--port",
        "8000",
      ]
    : [
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--port",
        "8000",
      ];

const fastApiProcess = spawn(
  pythonCommand,
  fastApiArgs,
  {
    cwd: path.join(ROOT, "ai-service"),
    stdio: "inherit",
    shell: false,
  },
);

// ============================================================
// SHUTDOWN HANDLING
// ============================================================

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log("\nStopping development servers...");

  if (!nextProcess.killed) {
    nextProcess.kill("SIGTERM");
  }

  if (!fastApiProcess.killed) {
    fastApiProcess.kill("SIGTERM");
  }

  setTimeout(() => {
    process.exit(0);
  }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

nextProcess.on("error", (error) => {
  console.error("Failed to start Next.js:", error.message);
  shutdown();
});

fastApiProcess.on("error", (error) => {
  console.error("Failed to start FastAPI:", error.message);
  shutdown();
});

nextProcess.on("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(`Next.js exited with code ${code}`);
    shutdown();
  }
});

fastApiProcess.on("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(`FastAPI exited with code ${code}`);
    shutdown();
  }
});