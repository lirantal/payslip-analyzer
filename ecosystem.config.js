module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "./frontend",
      script: "op",
      args: "run --env-file=.env -- pnpm run dev",
      interpreter: "none",
      autorestart: false,
      exec_mode: 'fork', 
    },
    {
      name: "backend",
      cwd: "./backend",
      script: "op",
      args: "run --env-file=.env -- pnpm run dev",
      interpreter: "none",
      autorestart: false,
      exec_mode: 'fork',
    },
    // only enable when running Caddy http proxy in the container
    // {
    //   name: "caddy",
    //   cwd: "./infra/http-server",  // Path to Caddy configuration
    //   script: "caddy",
    //   args: "run --config Caddyfile",   // Runs Caddy with the Caddyfile
    //   interpreter: "none",
    //   autorestart: false,
    //   exec_mode: 'fork',
    // }
  ]
};

