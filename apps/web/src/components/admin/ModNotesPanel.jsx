import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { discordAvatarUrl } from '@skz/shared'
import {
  createAdminModNote,
  deleteAdminModNote,
  fetchAdminGuildMembers,
  fetchAdminModNotes,
} from '@/services/skzAdmin'
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCalloutInfo,
  adminCalloutError,
  adminControl,
  adminControlTextarea,
  adminField,
  adminFieldHint,
  adminFieldLabel,
  adminInset,
  adminListRow,
  adminStack,
  adminSubsection,
  adminSubsectionHead,
} from '@/components/admin/adminUi'

const NOTES_PER_PAGE = 10
const MEMBERS_PAGE_SIZE = 100
const AUTOCOMPLETE_SIZE = 12

function memberAvatar(member) {
  return discordAvatarUrl(member.discord_user_id, member.avatar_hash, 128)
}

function memberDisplayName(member) {
  const display = String(member.display_name || '').trim()
  if (display) return display
  return member.username || member.discord_user_id
}

/** Discord login (@username) — always on its own line under the display name when cached. */
function memberLoginHandle(member) {
  const raw = String(member.username || '').trim()
  if (!raw) return null
  if (raw === member.discord_user_id || /^\d{17,20}$/.test(raw)) return null
  return raw.startsWith('@') ? raw : `@${raw}`
}

function memberToTarget(member) {
  return {
    target_discord_user_id: member.discord_user_id,
    target_username: member.username || member.discord_user_id,
    target_display_name: member.display_name || member.username || member.discord_user_id,
    target_avatar_url: memberAvatar(member),
    note_count: member.note_count ?? 0,
  }
}

function MemberRow({ member, active, onSelect }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(member)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
        active ? 'bg-violet-500/15 ring-1 ring-violet-500/35' : 'hover:bg-zinc-800/80'
      }`}
    >
      <img
        src={memberAvatar(member)}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-9 shrink-0 rounded-full bg-zinc-800 object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-100">
          {memberDisplayName(member)}
        </span>
        {memberLoginHandle(member) ? (
          <span className="block truncate text-xs text-zinc-500">{memberLoginHandle(member)}</span>
        ) : null}
        <span className="block truncate font-mono text-[11px] text-zinc-600">
          {member.discord_user_id}
        </span>
      </span>
      {member.note_count > 0 && (
        <span className="shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">
          {member.note_count}
        </span>
      )}
    </button>
  )
}

export default function ModNotesPanel({ readOnly = false, onError }) {
  const listboxId = useId()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [members, setMembers] = useState([])
  const [membersTotal, setMembersTotal] = useState(0)
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersLoadingMore, setMembersLoadingMore] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const [selectedMember, setSelectedMember] = useState(null)
  const [notesPayload, setNotesPayload] = useState(null)
  const [page, setPage] = useState(1)
  const [notesLoading, setNotesLoading] = useState(false)
  const [draftNote, setDraftNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const activeTargetId = selectedMember?.discord_user_id ?? ''
  const selectedSubject = selectedMember ? memberToTarget(selectedMember) : null

  const reportError = useCallback(
    (err) => {
      const msg = err?.message || 'Something went wrong'
      setLocalError(msg)
      onError?.(msg)
    },
    [onError],
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280)
    return () => clearTimeout(t)
  }, [search])

  const loadMembers = useCallback(
    async ({ query, offset = 0, append = false }) => {
      if (append) setMembersLoadingMore(true)
      else setMembersLoading(true)
      setLocalError('')
      try {
        const limit = query ? 80 : MEMBERS_PAGE_SIZE
        const data = await fetchAdminGuildMembers(query, { limit, offset })
        const rows = Array.isArray(data.members) ? data.members : []
        setMembers((prev) => (append ? [...prev, ...rows] : rows))
        setMembersTotal(data.total ?? rows.length)
      } catch (err) {
        reportError(err)
        if (!append) {
          setMembers([])
          setMembersTotal(0)
        }
      } finally {
        setMembersLoading(false)
        setMembersLoadingMore(false)
      }
    },
    [reportError],
  )

  useEffect(() => {
    loadMembers({ query: debouncedSearch, offset: 0, append: false })
    setHighlightIndex(-1)
  }, [debouncedSearch, loadMembers])

  const autocompleteSuggestions = useMemo(() => {
    if (!search.trim()) return []
    return members.slice(0, AUTOCOMPLETE_SIZE)
  }, [search, members])

  const showAutocomplete =
    pickerOpen && search.trim().length > 0 && autocompleteSuggestions.length > 0

  const canLoadMore = members.length < membersTotal && !membersLoading

  const loadNotes = useCallback(
    async (targetId, nextPage = 1) => {
      if (!targetId) {
        setNotesPayload(null)
        return
      }
      setNotesLoading(true)
      setLocalError('')
      try {
        const data = await fetchAdminModNotes(targetId, nextPage, NOTES_PER_PAGE)
        setNotesPayload(data)
        setPage(data.page ?? nextPage)
      } catch (err) {
        reportError(err)
      } finally {
        setNotesLoading(false)
      }
    },
    [reportError],
  )

  useEffect(() => {
    if (!activeTargetId) {
      setNotesPayload(null)
      return
    }
    loadNotes(activeTargetId, page)
  }, [activeTargetId, page, loadNotes])

  function selectMember(member) {
    setSelectedMember(member)
    setPage(1)
    setDraftNote('')
    setPickerOpen(false)
    setHighlightIndex(-1)
  }

  function handleSearchKeyDown(e) {
    if (!showAutocomplete) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, autocompleteSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectMember(autocompleteSuggestions[highlightIndex])
      setSearch('')
      setDebouncedSearch('')
    } else if (e.key === 'Escape') {
      setPickerOpen(false)
      setHighlightIndex(-1)
    }
  }

  async function handleAddNote() {
    if (!activeTargetId || !draftNote.trim() || !selectedSubject) return
    setBusy(true)
    setLocalError('')
    try {
      await createAdminModNote({
        targetDiscordUserId: activeTargetId,
        body: draftNote,
        targetUsername: selectedSubject.target_username,
        targetDisplayName: selectedSubject.target_display_name,
        targetAvatarUrl: selectedSubject.target_avatar_url,
      })
      setDraftNote('')
      await loadMembers({ query: debouncedSearch, offset: 0, append: false })
      if (selectedMember) {
        setSelectedMember({ ...selectedMember, note_count: (selectedMember.note_count ?? 0) + 1 })
      }
      await loadNotes(activeTargetId, 1)
      setPage(1)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteNote(noteId) {
    if (readOnly) return
    setBusy(true)
    setLocalError('')
    try {
      await deleteAdminModNote(noteId)
      await loadMembers({ query: debouncedSearch, offset: 0, append: false })
      await loadNotes(activeTargetId, page)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  const notes = notesPayload?.notes ?? []
  const totalPages = notesPayload?.total_pages ?? 1

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={adminSubsection}>
        <div className={adminSubsectionHead}>
          <div>
            <h4>Find member</h4>
            <p>Search or browse the guild member list.</p>
          </div>
        </div>

        <div className="relative">
          <label className={adminField}>
            <span className={adminFieldLabel}>Search</span>
            <input
              type="search"
              className={adminControl}
              placeholder="Name, @username, or user ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPickerOpen(true)
              }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setPickerOpen(false), 150)
              }}
              onKeyDown={handleSearchKeyDown}
              role="combobox"
              aria-expanded={showAutocomplete}
              aria-controls={showAutocomplete ? listboxId : undefined}
              aria-autocomplete="list"
              disabled={readOnly}
            />
            <span className={adminFieldHint}>
              {membersLoading
                ? 'Loading members…'
                : debouncedSearch
                  ? `${membersTotal} match${membersTotal === 1 ? '' : 'es'}`
                  : `${membersTotal} member${membersTotal === 1 ? '' : 's'} in server`}
            </span>
          </label>

          {showAutocomplete && (
            <ul
              id={listboxId}
              role="listbox"
              className={`${adminInset} absolute z-20 mt-1 max-h-56 w-full overflow-y-auto py-1`}
            >
              {autocompleteSuggestions.map((member, index) => (
                <li key={member.discord_user_id} role="presentation">
                  <MemberRow
                    member={member}
                    active={index === highlightIndex}
                    onSelect={(m) => {
                      selectMember(m)
                      setSearch('')
                      setDebouncedSearch('')
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${adminInset} mt-4`}>
          {membersLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : members.length === 0 ? (
            <div className="space-y-2 text-sm text-zinc-500">
              <p>{debouncedSearch ? 'No members match that search.' : 'No members in cache yet.'}</p>
              {!debouncedSearch && (
                <p className={adminCalloutInfo}>
                  Click <strong className="text-zinc-300">Sync Discord dropdowns</strong> on the bot hub
                  or run <strong className="text-zinc-300">/reload</strong>. Enable{' '}
                  <strong className="text-zinc-300">Server Members Intent</strong> for the bot.
                </p>
              )}
            </div>
          ) : (
            <>
              <ul className="max-h-[22rem] space-y-1 overflow-y-auto" role="listbox" aria-label="Guild members">
                {members.map((member) => (
                  <li key={member.discord_user_id} role="presentation">
                    <MemberRow
                      member={member}
                      active={member.discord_user_id === activeTargetId}
                      onSelect={selectMember}
                    />
                  </li>
                ))}
              </ul>
              {canLoadMore && (
                <button
                  type="button"
                  className={`${adminBtnSecondary} mt-3 w-full`}
                  disabled={membersLoadingMore}
                  onClick={() =>
                    loadMembers({
                      query: debouncedSearch,
                      offset: members.length,
                      append: true,
                    })
                  }
                >
                  {membersLoadingMore ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    `Load more (${members.length} of ${membersTotal})`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section className={adminSubsection}>
        <div className={adminSubsectionHead}>
          <div>
            <h4>Notes</h4>
            <p>{activeTargetId ? 'Add or remove notes below.' : 'Select a member first.'}</p>
          </div>
        </div>

        {localError && (
          <div className={`${adminCalloutError} mb-4`} role="alert">
            {localError}
          </div>
        )}

        {!activeTargetId ? (
          <p className="text-sm text-zinc-500">Pick a member from the list to continue.</p>
        ) : (
          <div className={adminStack}>
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={memberAvatar(selectedMember)}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-12 rounded-full bg-zinc-800 object-cover"
              />
              <div>
                <p className="font-semibold text-zinc-100">
                  {selectedSubject?.target_display_name ?? activeTargetId}
                </p>
                {memberLoginHandle(selectedMember) ? (
                  <p className="text-xs text-zinc-500">{memberLoginHandle(selectedMember)}</p>
                ) : null}
                <p className="font-mono text-xs text-zinc-500">{activeTargetId}</p>
              </div>
            </div>

            <label className={adminField}>
              <span className={adminFieldLabel}>New note</span>
              <textarea
                className={adminControlTextarea}
                rows={4}
                maxLength={2000}
                placeholder="Internal moderation note — visible to staff with Mod notes access."
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                disabled={readOnly || busy}
              />
              <span className={adminFieldHint}>{draftNote.length}/2000</span>
              <button
                type="button"
                className={`${adminBtnPrimary} mt-2`}
                disabled={readOnly || busy || !draftNote.trim()}
                onClick={handleAddNote}
              >
                <Plus className="size-4" />
                Add note
              </button>
            </label>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Notes on file
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={adminBtnSecondary}
                    disabled={page <= 1 || notesLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs text-zinc-500">
                    Page {page} of {totalPages}
                    {notesPayload?.total != null ? ` · ${notesPayload.total} total` : ''}
                  </span>
                  <button
                    type="button"
                    className={adminBtnSecondary}
                    disabled={page >= totalPages || notesLoading}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {notesLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading notes…
                </div>
              ) : notes.length === 0 ? (
                <p className="text-sm text-zinc-500">No notes for this member yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notes.map((note) => (
                    <li key={note.id} className={adminListRow}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-500">
                          {new Date(note.created_at).toLocaleString()} · {note.author_username}
                          {note.source === 'admin_panel' ? ' · Admin panel' : ' · Discord'}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{note.body}</p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-600">{note.id}</p>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteNote(note.id)}
                          className="shrink-0 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25"
                          aria-label="Remove note"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
