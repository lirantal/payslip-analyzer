export default defineAppConfig({
  // App Identity
  identity: {
    name: 'Payslip Analyzer',
    tagline: 'Understand your Israeli payslip',
    description: 'Upload a payslip image, get structured pay, tax, pension, and benefits insights powered by AI.'
  },

  // SEO Defaults
  seo: {
    ogImage: '/og-image.png',
    twitterCard: 'summary_large_image' as const
  },

  // Branding Assets
  branding: {
    logo: '/logo.svg',
    logoAlt: 'Payslip Analyzer',
    favicon: '/logo.svg'
  },

  // Teams/Workspaces (optional - enables team switcher dropdown in sidebar)
  // Leave empty array to show simple app branding instead
  // For example: `teams: [{'label': 'Upload Bucket', 'logo': '/logo.svg'}] as Array<{ label: string, logo: string }>`
  teams: [] as Array<{ label: string, logo: string }>,

  // External Links
  links: {

    // these will show up in the user menu when it is clicked and expanded
    documentation: '',
    repository: '',

    // these will show up in the left-side nav bar on the bottom of the page
    support: '',
    feedback: ''
  },

  // UI Configuration
  ui: {
    colors: {
      primary: 'green',
      neutral: 'zinc'
    }
  },

  // Feature Flags (for development/testing)
  features: {
    // Show theme color picker in user menu (primary/neutral colors)
    showThemePicker: false,
    // Show appearance toggle in user menu (light/dark mode)
    showAppearanceToggle: false
  }
})
