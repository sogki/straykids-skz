/** User-facing admin strings — avoid database table names and migration file IDs. */

export const ADMIN_SETUP_INCOMPLETE =
  'This section is not fully set up yet. Ask your developer to apply pending database updates, then click Refresh.'

export const BOT_SETTINGS_SAVED_SUCCESS =
  'Bot settings saved. Run /reload in Discord (or wait for the outbox poll) to apply changes.'

export const BOT_HUB_INTRO =
  'Choose a section to configure. Changes are saved to bot settings and reaction panels.'

export const BOT_PAGE_INTRO =
  'Configure credentials, server options, reaction panels, and moderation logging.'

export const CREDENTIALS_INTRO =
  'Secrets used by the Discord bot and player sign-in. Saved in bot settings — not Railway env files.'

export const ANALYTICS_INTRO =
  'Traffic and game activity from site analytics (excluded countries omitted from KPIs — see Leaderboard).'

export const ANALYTICS_PAGE_INTRO = 'Traffic and game activity from site analytics.'
