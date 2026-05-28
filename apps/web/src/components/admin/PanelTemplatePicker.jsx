import { ChevronRight, LayoutTemplate, Megaphone, Palette, ShieldCheck } from 'lucide-react'
import { adminHubCard, adminPanel } from '@/components/admin/adminUi'

const TEMPLATES = [
  {
    id: 'verify',
    kind: 'verify',
    slug: 'verify',
    label: 'Verify',
    description: 'Members click Verify to unlock the server (with a private confirmation).',
    tag: 'Essential',
    tagColor: 'text-emerald-400 bg-emerald-500/10',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    interaction_mode: 'button',
    embed: {
      title: '**Verify**',
      description: 'Click **Verify** below to get access to the server.',
      color: 0x5865f2,
    },
  },
  {
    id: 'reaction_roles',
    kind: 'reaction_roles',
    slug: 'reaction-roles',
    label: 'Reaction roles',
    description: 'Let members pick roles by reacting or clicking buttons.',
    tag: 'Function',
    tagColor: 'text-sky-400 bg-sky-500/10',
    icon: Palette,
    iconBg: 'bg-violet-500/15 text-violet-400',
    interaction_mode: 'reaction',
    embed: {
      title: 'Pick your roles',
      description: 'Choose the options that apply to you.',
      color: 0x5865f2,
    },
  },
  {
    id: 'general',
    kind: 'general',
    slug: 'announcement',
    label: 'Announcement',
    description: 'Post a rich embed without role interactions.',
    tag: 'General',
    tagColor: 'text-zinc-400 bg-zinc-500/10',
    icon: Megaphone,
    iconBg: 'bg-amber-500/15 text-amber-400',
    interaction_mode: 'reaction',
    embed: {
      title: 'Announcement',
      description: '',
      color: 0x5865f2,
    },
  },
  {
    id: 'scratch',
    kind: 'reaction_roles',
    slug: '',
    label: 'Start from scratch',
    description: 'Blank panel — you choose everything.',
    tag: 'Custom',
    tagColor: 'text-zinc-500 bg-zinc-800/80',
    icon: LayoutTemplate,
    iconBg: 'bg-zinc-800 text-zinc-400',
    interaction_mode: 'button',
    embed: {},
  },
]

export { TEMPLATES }

export default function PanelTemplatePicker({ onSelect }) {
  return (
    <div className={adminPanel}>
      <div className="mb-8">
        <h3 className="text-xl font-bold tracking-tight text-white">Reaction panels</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Let your members get roles by reacting to a message — choose a starting point.
        </p>
      </div>

      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-600">
        Choose starting point
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} type="button" onClick={() => onSelect(t)} className={`group ${adminHubCard}`}>
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-100">{t.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                </span>
                <span className="mt-1 block text-sm leading-snug text-zinc-500">
                  {t.description}
                </span>
                <span
                  className={`mt-3 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.tagColor}`}
                >
                  {t.tag}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
