import { getSupabaseClient } from '@/lib/supabase/client'

const REQUEST_ERRORS = {
  invalid_request_type: 'Please choose a valid request type.',
  invalid_name: 'Please enter your name (2–120 characters).',
  invalid_email: 'Please enter a valid email address.',
  invalid_message: 'Please enter a message (at least 10 characters).',
  invalid_subject: 'Subject is too long (max 200 characters).',
  rate_limited: 'Too many requests from this email. Try again in about an hour.',
}

function mapRequestError(err) {
  const msg = err?.message || ''
  for (const [code, text] of Object.entries(REQUEST_ERRORS)) {
    if (msg.includes(code)) return new Error(text)
  }
  return err
}

export async function submitSiteRequest({
  requestType,
  name,
  email,
  subject,
  message,
  pageUrl,
}) {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.rpc('skz_submit_site_request', {
    p_request_type: requestType,
    p_name: name.trim(),
    p_email: email.trim(),
    p_subject: subject?.trim() || '',
    p_message: message.trim(),
    p_page_url: pageUrl || null,
  })

  if (error) throw mapRequestError(error)
  return data
}
