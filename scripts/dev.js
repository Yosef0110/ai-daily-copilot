const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";

  const result = spawnSync(checker, [command], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  return result.status === 0;
}

console.log("Starting AI Daily Copilot...\n");

// ============================================================
// ROOT NODE DEPENDENCIES
// ============================================================

if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  console.log("Installing root dependencies...");
  const result = run("npm", ["install"]);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} else {
  console.log("Root dependencies already installed.");
}

// ============================================================
// WEB DEPENDENCIES
// ============================================================

if (!fs.existsSync(path.join(ROOT, "web", "node_modules"))) {
  console.log("Installing web dependencies...");
  const result = run("npm", ["--prefix", "web", "install"]);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} else {
  console.log("Web dependencies already installed.");
}

// ============================================================
// PYTHON
// ============================================================

const pythonCommand = process.platform === "win32" ? "python" : "python";

if (!commandExists(pythonCommand)) {
  console.error("Python tidak ditemukan.");
  process.exit(1);
}

console.log("Checking Python requirements...");

const pipResult = run(pythonCommand, [
  "-m",
  "pip",
  "install",
  "-r",
  "ai-service/requirements.txt",
  "--quiet",
]);

if (pipResult.status !== 0) {
  process.exit(pipResult.status ?? 1);
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

const dockerResult = spawnSync("docker", ["info"], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

if (dockerResult.status !== 0) {
  console.error("Docker belum berjalan.");
  console.error("Jalankan Docker Desktop terlebih dahulu.");
  process.exit(1);
}

console.log("Docker is running.");

// ============================================================
// SUPABASE
// ============================================================

if (!commandExists("supabase")) {
  console.error("Supabase CLI tidak ditemukan.");
  process.exit(1);
}

console.log("Checking Supabase...");

const supabaseStatus = spawnSync("supabase", ["status"], {
  cwd: ROOT,
  stdio: "ignore",
  shell: process.platform === "win32",
});

if (supabaseStatus.status !== 0) {
  console.log("Starting Supabase...");

  const startResult = run("supabase", ["start"]);

  if (startResult.status !== 0) {
    process.exit(startResult.status ?? 1);
  }
} else {
  console.log("Supabase already running.");
}

// ============================================================
// NEXT.JS + FASTAPI
// ============================================================

console.log("\nStarting Next.js and FastAPI...\n");

const concurrentlyBin =
  process.platform === "win32"
    ? path.join(ROOT, "node_modules", ".bin", "concurrently.cmd")
    : path.join(ROOT, "node_modules", ".bin", "concurrently");

const child = spawn(
  concurrentlyBin,
  [
    "npm --prefix web run dev",
    "cd ai-service && python -m uvicorn app.main:app --reload --port 8000",
  ],
  {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});