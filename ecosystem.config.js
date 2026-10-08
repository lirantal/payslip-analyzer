module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "./frontend",
      script: "op",
      // Array form: PM2 must not pass a single "run -- ..." string or `op`/`pnpm` argv breaks.
      args: ["run", "--env-file=.env", "--", "pnpm", "run", "dev"],
      interpreter: "none",
      autorestart: false,
      exec_mode: 'fork',
    },
    {
      name: "backend",
      cwd: "./backend",
      // Run the same entry as `pnpm run dev` without PM2 driving `pnpm` (some PM2
      // versions mishandle argv and you get 1Password-style `exec: "dev" not found`).
      script: "./scripts/wrangler-cli.mjs",
      args: ["dev"],
      interpreter: "node",
      autorestart: false,
      exec_mode: "fork",
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

