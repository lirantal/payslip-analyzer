/**
 * SEO Composable for consistent page-level metadata
 *
 * Provides a unified way to set page SEO that automatically
 * includes the app name and default SEO configuration.
 *
 * @example
 * // In a page component
 * usePageSeo('Login', 'Sign in to your account')
 *
 * // This will set:
 * // - title: "Login | Payslip Analyzer"
 * // - description: "Sign in to your account"
 * // - ogTitle: "Login | Payslip Analyzer"
 * // - etc.
 */
export function usePageSeo(pageTitle: string, pageDescription?: string) {
  const appConfig = useAppConfig()

  const fullTitle = `${pageTitle} | ${appConfig.identity.name}`
  const description = pageDescription || appConfig.identity.description

  useSeoMeta({
    title: fullTitle,
    description,
    ogTitle: fullTitle,
    ogDescription: description,
    ogImage: appConfig.seo.ogImage,
    twitterImage: appConfig.seo.ogImage,
    twitterCard: appConfig.seo.twitterCard
  })
}
