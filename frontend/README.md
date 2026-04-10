# Payslip Analyzer (Nuxt frontend)

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Nuxt UI dashboard shell for payslip image upload and analysis. API requests go to the Worker (`NUXT_PUBLIC_API_BASE_URL` in dev, e.g. `http://127.0.0.1:8787`). **Production (Cloudflare Pages):** set `BACKEND_URL` to your Worker URL so [`server/api/[...].ts`](server/api/[...].ts) can proxy `/api/*` and keep session cookies on the Pages origin.

This repo started from the [Nuxt dashboard template](https://dashboard-template.nuxt.dev/); event/upload-bucket pages were removed in favor of the payslip flow.

- [Live demo](https://dashboard-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt)

<a href="https://dashboard-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/dashboard-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png">
    <img alt="Nuxt Dashboard Template" src="https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png">
  </picture>
</a>

> The dashboard template for Vue is on https://github.com/nuxt-ui-templates/dashboard-vue.

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t github:nuxt-ui-templates/dashboard
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=dashboard&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fdashboard&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fdashboard-dark.png&demo-url=https%3A%2F%2Fdashboard-template.nuxt.dev%2F&demo-title=Nuxt%20Dashboard%20Template&demo-description=A%20dashboard%20template%20with%20multi-column%20layout%20for%20building%20sophisticated%20admin%20interfaces.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
