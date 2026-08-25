const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IS_WINDOWS = process.platform === "win32";

// ============================================================
// HELPERS
// ============================================================

function commandExists(command) {
  const checker = IS_WINDOWS ? "where" : "which";

  const result = spawnSync(checker, [command], {
    stdio: "ignore",
    shell: IS_WINDOWS,
  });

  return result.status === 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: IS_WINDOWS,
    ...options,
  });

  if (result.error) {
    console.error(`Failed to run ${command}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${command} exited with code ${result.status}`);
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

  if (IS_WINDOWS) {
    run("cmd.exe", ["/d", "/s", "/c", "npm install"], {
      shell: false,
    });
  } else {
    run("npm", ["install"]);
  }
} else {
  console.log("Root dependencies already installed.");
}

// ============================================================
// WEB DEPENDENCIES
// ============================================================

if (!fs.existsSync(path.join(ROOT, "web", "node_modules"))) {
  console.log("Installing web dependencies...");

  if (IS_WINDOWS) {
    run(
      "cmd.exe",
      ["/d", "/s", "/c", "npm --prefix web install"],
      {
        shell: false,
      },
    );
  } else {
    run("npm", ["--prefix", "web", "install"]);
  }
} else {
  console.log("Web dependencies already installed.");
}

// ============================================================
// PYTHON
// ============================================================

const pythonCandidates = IS_WINDOWS
  ? ["python", "py"]
  : ["python", "python3"];

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
    "Install Python atau aktifkan environment project terlebih dahulu.",
  );
  process.exit(1);
}

console.log(`Using Python command: ${pythonCommand}`);
console.log("Checking Python requirements...");

run(
  pythonCommand,
  [
    "-m",
    "pip",
    "install",
    "-r",
    "ai-service/requirements.txt",
    "--quiet",
  ],
  {
    shell: IS_WINDOWS && pythonCommand === "py",
  },
);

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
  shell: IS_WINDOWS,
});

if (dockerStatus.error) {
  console.error(
    "Gagal mengecek Docker:",
    dockerStatus.error.message,
  );
  process.exit(1);
}

if (dockerStatus.status !== 0) {
  console.error("Docker Desktop belum berjalan.");
  console.error(
    "Jalankan Docker Desktop lalu jalankan npm run dev lagi.",
  );
  process.exit(1);
}

console.log("Docker is running.");

// ============================================================
// SUPABASE CLI
// ============================================================

if (!commandExists("supabase")) {
  console.error("Supabase CLI tidak ditemukan.");
  console.error(
    "Install Supabase CLI terlebih dahulu, lalu jalankan npm run dev lagi.",
  );
  process.exit(1);
}

// ============================================================
// SUPABASE STATUS / START
// ============================================================

console.log("Checking Supabase...");

const supabaseStatus = spawnSync(
  "supabase",
  ["status"],
  {
    cwd: ROOT,
    stdio: "ignore",
    shell: IS_WINDOWS,
  },
);

if (supabaseStatus.status !== 0) {
  console.log(
    "Supabase is not running. Starting Supabase...",
  );

  const startResult = spawnSync(
    "supabase",
    ["start"],
    {
      cwd: ROOT,
      stdio: "inherit",
      shell: IS_WINDOWS,
    },
  );

  if (startResult.error) {
    console.error(
      "Failed to start Supabase:",
      startResult.error.message,
    );
    process.exit(1);
  }

  if (startResult.status !== 0) {
    console.error(
      `Supabase start failed with exit code ${startResult.status}`,
    );
    process.exit(startResult.status ?? 1);
  }

  console.log("Supabase started successfully.");
} else {
  console.log("Supabase already running.");
}

// ============================================================
// LOCAL ENV GENERATION
// ============================================================

console.log("Preparing local environment variables...");

const statusResult = spawnSync(
  "supabase",
  ["status", "-o", "env"],
  {
    cwd: ROOT,
    encoding: "utf8",
    shell: IS_WINDOWS,
  },
);

if (statusResult.error) {
  console.error(
    "Failed to read Supabase local environment:",
    statusResult.error.message,
  );
  process.exit(1);
}

if (statusResult.status !== 0) {
  console.error(
    "Failed to read Supabase local environment.",
  );

  if (statusResult.stderr) {
    console.error(statusResult.stderr);
  }

  process.exit(1);
}

const supabaseEnv = statusResult.stdout;

function readEnvValue(name) {
  const match = supabaseEnv.match(
    new RegExp(`^${name}=(.*)$`, "m"),
  );

  if (!match) {
    return null;
  }

  return match[1]
    .replace(/^["']|["']$/g, "")
    .trim();
}

const supabaseUrl =
  readEnvValue("API_URL") ??
  "http://127.0.0.1:54321";

const publishableKey =
  readEnvValue("PUBLISHABLE_KEY") ??
  readEnvValue("ANON_KEY");

if (!publishableKey) {
  console.error(
    "Could not determine the local Supabase publishable key.",
  );
  process.exit(1);
}

const webEnvPath = path.join(
  ROOT,
  "web",
  ".env.local",
);

const envContent = [
  `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
  `NEXT_PUBLIC_AI_SERVICE_URL=http://127.0.0.1:8000`,
  "",
].join("\n");

fs.writeFileSync(
  webEnvPath,
  envContent,
  "utf8",
);

console.log("Local web/.env.local is ready.");

// ============================================================
// NEXT.JS + FASTAPI
// ============================================================

console.log("\nStarting Next.js and FastAPI...\n");

let nextProcess;

if (IS_WINDOWS) {
  nextProcess = spawn(
    "cmd.exe",
    [
      "/d",
      "/s",
      "/c",
      "npm --prefix web run dev",
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
    },
  );
} else {
  nextProcess = spawn(
    "npm",
    ["--prefix", "web", "run", "dev"],
    {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
    },
  );
}

let fastApiProcess;

if (IS_WINDOWS && pythonCommand === "py") {
  fastApiProcess = spawn(
    "cmd.exe",
    [
      "/d",
      "/s",
      "/c",
      "py -m uvicorn app.main:app --reload --port 8000",
    ],
    {
      cwd: path.join(ROOT, "ai-service"),
      stdio: "inherit",
      shell: false,
    },
  );
} else {
  fastApiProcess = spawn(
    pythonCommand,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--port",
      "8000",
    ],
    {
      cwd: path.join(ROOT, "ai-service"),
      stdio: "inherit",
      shell: false,
    },
  );
}

// ============================================================
// SHUTDOWN HANDLING
// ============================================================

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("\nStopping development servers...");

  if (IS_WINDOWS) {
    if (nextProcess.pid) {
      spawnSync(
        "taskkill",
        ["/pid", String(nextProcess.pid), "/t", "/f"],
        {
          stdio: "ignore",
          shell: true,
        },
      );
    }

    if (fastApiProcess.pid) {
      spawnSync(
        "taskkill",
        ["/pid", String(fastApiProcess.pid), "/t", "/f"],
        {
          stdio: "ignore",
          shell: true,
        },
      );
    }
  } else {
    if (!nextProcess.killed) {
      nextProcess.kill("SIGTERM");
    }

    if (!fastApiProcess.killed) {
      fastApiProcess.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ============================================================
// PROCESS ERROR HANDLING
// ============================================================

nextProcess.on("error", (error) => {
  console.error(
    "Failed to start Next.js:",
    error.message,
  );

  shutdown();
});

fastApiProcess.on("error", (error) => {
  console.error(
    "Failed to start FastAPI:",
    error.message,
  );

  shutdown();
});

nextProcess.on("exit", (code) => {
  if (
    !shuttingDown &&
    code !== null &&
    code !== 0
  ) {
    console.error(
      `Next.js exited with code ${code}`,
    );

    shutdown();
  }
});

fastApiProcess.on("exit", (code) => {
  if (
    !shuttingDown &&
    code !== null &&
    code !== 0
  ) {
    console.error(
      `FastAPI exited with code ${code}`,
    );

    shutdown();
  }
});