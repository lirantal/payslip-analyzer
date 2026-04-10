/**
 * Additional environment variable declarations for optional feature flags
 * These extend the auto-generated Cloudflare.Env interface
 */
declare namespace Cloudflare {
  interface Env {
    /**
     * Enable/disable email+password authentication
     * Set to "false" to disable (only social login will be available)
     * Defaults to enabled if not set
     */
    EMAIL_PASSWORD_AUTH_ENABLED?: string;
    /** Google Gemini API key for payslip vision analysis */
    GEMINI_API_KEY: string;
    /** Set to "true" or "1" to skip nekudot box refinement (second Gemini pass) */
    DISABLE_NEKUDOT_REFINE?: string;
    /**
     * When "true" or "1", POST /api/payslip/analyze returns data from
     * `fixtures/payslip-analyze-dev-response.json` (no Gemini). Useful for UI work.
     */
    PAYSLIP_USE_ANALYZE_FIXTURE?: string;
  }
}

/** Global worker env (wrangler `Cloudflare.Env` + augmentations above). */
type Env = Cloudflare.Env
