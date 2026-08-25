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

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  run(npmCommand, ["install"]);
} else {
  console.log("Root dependencies already installed.");
}

// ============================================================
// WEB DEPENDENCIES
// ============================================================

if (!fs.existsSync(path.join(ROOT, "web", "node_modules"))) {
  console.log("Installing web dependencies...");

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  run(npmCommand, ["--prefix", "web", "install"]);
} else {
  console.log("Web dependencies already installed.");
}

// ============================================================
// PYTHON
// ============================================================

const pythonCandidates =
  process.platform === "win32" ? ["python", "py"] : ["python3", "python"];

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
  run("py", ["-m", "pip", "install", "-r", "ai-service/requirements.txt"]);
} else {
  run(pythonCommand, [
    "-m",
    "pip",
    "install",
    "-r",
    "ai-service/requirements.txt",
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
  console.error("Jalankan Docker Desktop lalu jalankan npm run dev lagi.");
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

const status = spawnSync("npx", ["supabase", "status"], {
  cwd: ROOT,
  encoding: "utf8",
  shell: true,
});

const output = `${status.stdout ?? ""}\n${status.stderr ?? ""}`;

if (
  status.status === 0 &&
  output.includes("supabase local development setup is running")
) {
  console.log("Supabase already running.");
} else {
  console.log("Supabase is not running. Starting Supabase...");

  const start = spawnSync("npx", ["supabase", "start"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });

  if (start.status !== 0) {
    console.error("Failed to start Supabase.");
    process.exit(1);
  }
}

// ============================================================
// NEXT.JS + FASTAPI
// ============================================================
const pyC =
  process.platform === "win32" ? "py" : "python3";

const fastApiArgs = [
  "-m",
  "uvicorn",
  "app.main:app",
  "--reload",
  "--port",
  "8000",
];

let fastApiProcess;

try {
  fastApiProcess = spawn(
    pyC,
    fastApiArgs,
    {
      cwd: path.join(ROOT, "ai-service"),
      stdio: "inherit",
      shell: false,
    }
  );
} catch (error) {
  console.error("Failed to start FastAPI:");
  console.error(error);

  if (!nextProcess.killed) {
    nextProcess.kill("SIGTERM");
  }

  process.exit(1);
}