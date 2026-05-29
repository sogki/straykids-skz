/** Placeholders for /notes view embed shell (note rows are appended by the bot). */

export const MOD_NOTES_VIEW_PLACEHOLDERS = [
  { token: '{target_display_name}', description: 'Member display name' },
  { token: '{target_username}', description: "Member's Discord username" },
  { token: '{target_user_id}', description: 'Discord user ID' },
  { token: '{target_mention}', description: 'Mentions the member' },
  { token: '{page}', description: 'Current page number' },
  { token: '{total_pages}', description: 'Total pages' },
  { token: '{total_notes}', description: 'Total notes on file' },
  { token: '{avatar_url}', description: 'Avatar URL (thumbnail)' },
  { token: '{event_title}', description: 'Title override (e.g. Mod notes)' },
]

export const MOD_NOTES_VIEW_PREVIEW_CTX = {
  target_display_name: 'Example STAY',
  target_username: 'example_stay',
  target_user_id: '123456789012345678',
  target_mention: '@example_stay',
  page: '1',
  total_pages: '2',
  total_notes: '3',
  avatar_url: '',
  event_title: 'Mod notes',
}
