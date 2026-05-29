-- Guild members in skz_bot_discord_cache (username + avatar in extra JSON).

ALTER TABLE skz_bot_discord_cache
  DROP CONSTRAINT IF EXISTS skz_bot_discord_cache_entity_type_check;

ALTER TABLE skz_bot_discord_cache
  ADD CONSTRAINT skz_bot_discord_cache_entity_type_check
  CHECK (entity_type IN ('channel', 'role', 'member'));

CREATE INDEX IF NOT EXISTS skz_bot_discord_cache_guild_member_name_idx
  ON skz_bot_discord_cache (guild_id, lower(name))
  WHERE entity_type = 'member';

CREATE OR REPLACE FUNCTION skz_admin_bot_search_guild_members(
  p_session_token text,
  p_query text DEFAULT '',
  p_limit int DEFAULT 80,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id text;
  v_query text;
  v_limit int;
  v_offset int;
  v_total int;
BEGIN
  IF NOT skz_admin_bot_session_can_manage_mod_notes(p_session_token) THEN
    RAISE EXCEPTION 'insufficient permission' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_guild_id FROM skz_bot_settings WHERE key = 'guild_id' LIMIT 1;
  v_query := lower(trim(COALESCE(p_query, '')));
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 80), 200));
  v_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT count(*)::int INTO v_total
  FROM skz_bot_discord_cache c
  WHERE c.guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), c.guild_id)
    AND c.entity_type = 'member'
    AND (
      v_query = ''
      OR lower(c.name) LIKE '%' || v_query || '%'
      OR lower(COALESCE(c.extra->>'username', '')) LIKE '%' || v_query || '%'
      OR lower(COALESCE(c.extra->>'display_name', '')) LIKE '%' || v_query || '%'
      OR c.entity_id LIKE v_query || '%'
    );

  RETURN jsonb_build_object(
    'members', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.display_name, r.username)
      FROM (
        SELECT
          c.entity_id AS discord_user_id,
          COALESCE(NULLIF(trim(c.extra->>'username'), ''), NULLIF(trim(c.name), ''), c.entity_id) AS username,
          COALESCE(
            NULLIF(trim(c.extra->>'display_name'), ''),
            NULLIF(trim(c.extra->>'global_name'), ''),
            NULLIF(trim(c.name), ''),
            NULLIF(trim(c.extra->>'username'), ''),
            c.entity_id
          ) AS display_name,
          COALESCE(NULLIF(trim(c.extra->>'avatar_url'), ''), '') AS avatar_url,
          COALESCE(nc.note_count, 0) AS note_count
        FROM skz_bot_discord_cache c
        LEFT JOIN (
          SELECT target_discord_user_id, count(*)::int AS note_count
          FROM skz_bot_mod_notes
          WHERE guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), guild_id)
            AND deleted_at IS NULL
          GROUP BY target_discord_user_id
        ) nc ON nc.target_discord_user_id = c.entity_id
        WHERE c.guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), c.guild_id)
          AND c.entity_type = 'member'
          AND (
            v_query = ''
            OR lower(c.name) LIKE '%' || v_query || '%'
            OR lower(COALESCE(c.extra->>'username', '')) LIKE '%' || v_query || '%'
            OR lower(COALESCE(c.extra->>'display_name', '')) LIKE '%' || v_query || '%'
            OR c.entity_id LIKE v_query || '%'
          )
        ORDER BY lower(COALESCE(c.extra->>'display_name', c.name)), lower(COALESCE(c.extra->>'username', ''))
        LIMIT v_limit
        OFFSET v_offset
      ) r
    ), '[]'::jsonb),
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'query', trim(COALESCE(p_query, ''))
  );
END;
$$;
