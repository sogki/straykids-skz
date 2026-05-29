-- Store Discord avatar hash for reliable CDN URLs in admin UI.

ALTER TABLE skz_admin_discord_member_roles_cache
  ADD COLUMN IF NOT EXISTS avatar_hash text NOT NULL DEFAULT '';

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
  FROM skz_admin_discord_member_roles_cache m
  WHERE m.guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), m.guild_id)
    AND (
      v_query = ''
      OR lower(m.display_name) LIKE '%' || v_query || '%'
      OR lower(COALESCE(m.username, '')) LIKE '%' || v_query || '%'
      OR m.discord_user_id LIKE v_query || '%'
    );

  RETURN jsonb_build_object(
    'members', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.display_name, r.username)
      FROM (
        SELECT
          m.discord_user_id,
          COALESCE(
            NULLIF(trim(c.extra->>'username'), ''),
            NULLIF(trim(m.username), ''),
            NULLIF(trim(m.display_name), ''),
            m.discord_user_id
          ) AS username,
          COALESCE(
            NULLIF(trim(c.extra->>'display_name'), ''),
            NULLIF(trim(c.extra->>'global_name'), ''),
            NULLIF(trim(c.name), ''),
            NULLIF(trim(m.display_name), ''),
            NULLIF(trim(m.username), ''),
            m.discord_user_id
          ) AS display_name,
          COALESCE(
            NULLIF(trim(c.extra->>'avatar_hash'), ''),
            NULLIF(trim(m.avatar_hash), ''),
            ''
          ) AS avatar_hash,
          COALESCE(
            NULLIF(trim(c.extra->>'avatar_url'), ''),
            NULLIF(trim(m.avatar_url), ''),
            ''
          ) AS avatar_url
        FROM skz_admin_discord_member_roles_cache m
        LEFT JOIN skz_bot_discord_cache c
          ON c.guild_id = m.guild_id
          AND c.entity_type = 'member'
          AND c.entity_id = m.discord_user_id
        LEFT JOIN (
          SELECT target_discord_user_id, count(*)::int AS note_count
          FROM skz_bot_mod_notes
          WHERE guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), guild_id)
            AND deleted_at IS NULL
          GROUP BY target_discord_user_id
        ) nc ON nc.target_discord_user_id = m.discord_user_id
        WHERE m.guild_id = COALESCE(NULLIF(trim(v_guild_id), ''), m.guild_id)
          AND (
            v_query = ''
            OR lower(m.display_name) LIKE '%' || v_query || '%'
            OR lower(COALESCE(m.username, '')) LIKE '%' || v_query || '%'
            OR m.discord_user_id LIKE v_query || '%'
            OR lower(COALESCE(c.name, '')) LIKE '%' || v_query || '%'
          )
        ORDER BY lower(COALESCE(c.extra->>'display_name', m.display_name)), lower(COALESCE(c.extra->>'username', m.username))
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
