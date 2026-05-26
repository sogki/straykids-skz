# Shadcn Blocks (Dashboard 13)

The admin area uses the **[Dashboard 13](https://www.shadcnblocks.com/block/dashboard13)** layout (collapsible sidebar, live KPIs, traffic chart, signal stream, country/game metric panels).

## Install the official Pro block

1. Create an API key at [shadcnblocks.com/dashboard/api](https://www.shadcnblocks.com/dashboard/api).
2. Add to `components.json`:

```json
{
  "registries": {
    "@shadcnblocks": {
      "url": "https://shadcnblocks.com/r/{name}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

3. Install the block:

```bash
npx shadcn add @shadcnblocks/dashboard13
```

4. Wire the generated component in `src/pages/admin/AdminOverview.tsx` (replace the import from `@/components/blocks/dashboard13`).

Until then, `src/components/blocks/dashboard13.tsx` provides the same structure with your live Supabase analytics.
