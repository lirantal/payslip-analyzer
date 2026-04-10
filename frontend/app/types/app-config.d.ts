/**
 * App Configuration Type Definitions
 *
 * This file defines the TypeScript types for the app.config.ts configuration.
 * It extends the Nuxt AppConfig interface to provide type safety for custom config values.
 */

export interface AppIdentity {
  /** The name of the application */
  name: string
  /** A short tagline describing the app */
  tagline: string
  /** A longer description for SEO and about pages */
  description: string
}

export interface AppSeo {
  /** Default Open Graph image path (relative to public/) */
  ogImage: string
  /** Twitter card type */
  twitterCard: 'summary' | 'summary_large_image'
}

export interface AppBranding {
  /** Path to the logo file (relative to public/) */
  logo: string
  /** Alt text for the logo */
  logoAlt: string
  /** Path to the favicon (relative to public/) */
  favicon: string
}

export interface AppLinks {
  /** URL to documentation site */
  documentation: string
  /** Support contact (URL or mailto:) */
  support: string
  /** Feedback/feature request URL */
  feedback: string
  /** Source code repository URL */
  repository: string
}

export interface AppUiColors {
  /** Primary color name from Tailwind palette */
  primary: string
  /** Neutral color name from Tailwind palette */
  neutral: string
}

export interface AppUi {
  colors: AppUiColors
}

export interface AppFeatures {
  /** Show theme color picker in user menu (primary/neutral colors) */
  showThemePicker: boolean
  /** Show appearance toggle in user menu (light/dark mode) */
  showAppearanceToggle: boolean
}

export interface AppTeam {
  /** Team display name */
  label: string
  /** Team logo URL or path */
  logo: string
}

declare module 'nuxt/schema' {
  interface AppConfigInput {
    identity?: Partial<AppIdentity>
    seo?: Partial<AppSeo>
    branding?: Partial<AppBranding>
    teams?: AppTeam[]
    links?: Partial<AppLinks>
    ui?: Partial<AppUi>
    features?: Partial<AppFeatures>
  }
}

declare module '@nuxt/schema' {
  interface AppConfigInput {
    identity?: Partial<AppIdentity>
    seo?: Partial<AppSeo>
    branding?: Partial<AppBranding>
    teams?: AppTeam[]
    links?: Partial<AppLinks>
    ui?: Partial<AppUi>
    features?: Partial<AppFeatures>
  }
}

// Augment the useAppConfig return type
declare module '#app' {
  interface AppConfig {
    identity: AppIdentity
    seo: AppSeo
    branding: AppBranding
    teams: AppTeam[]
    links: AppLinks
    ui: AppUi
    features: AppFeatures
  }
}

export {}
