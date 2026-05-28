-- Fix skz_normalize_qotd_question_type if 20260528000015 failed on invalid CASE syntax.

CREATE OR REPLACE FUNCTION skz_normalize_qotd_question_type(p_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE lower(trim(COALESCE(p_type, '')))
    WHEN 'would_you_rather' THEN 'would_you_rather'
    WHEN 'wyr' THEN 'would_you_rather'
    WHEN 'would-you-rather' THEN 'would_you_rather'
    WHEN 'throwback_thursday' THEN 'throwback_thursday'
    WHEN 'throwback' THEN 'throwback_thursday'
    WHEN 'tbt' THEN 'throwback_thursday'
    WHEN 'throwback-thursday' THEN 'throwback_thursday'
    ELSE 'standard'
  END;
END;
$$;
