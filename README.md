we are peoples theatre laboratory,

https://www.instagram.com/peoplestheatrelaboratory/
https://www.facebook.com/ptlvadodara/

https://kabirsangruhdari2026.my.canva.site/vadodara-2026/
https://p7698-12.my.canva.site/kabir-ruhdar/#home-page

we also have a notion where we store lyrics for few that we sing

we host events every month called bethak

we want to make a website that will contain few stuff

- home page (discussed with owner she doesn't want a typical homepage, she wants upcoming event at home page and just a single page.)
- event pages
- lyrics
- front page
- about us
- timeline

below sections will be only for volunteers and organisers

- basic design system
- fonts
- card designs

we will discuss more after you done research about PTL.
meanwhile make a index page just simple PTL coming soon... something like this, it should also contain bethak and KSR (Kabir sang ruhdari) events we do.

---

## Development

Astro static site. Package manager: **Bun** (Node >= 22.12 for the Astro toolchain).

```sh
bun install
bun run dev      # local dev server
bun run build    # -> dist/
bun run preview  # serve dist/ exactly as production does
bun run check    # astro + typescript check
```

Layout:

- `src/pages/` — routes (`index.astro` -> `/`)
- `src/layouts/BaseLayout.astro` — html shell, meta/OG, fonts
- `src/styles/` — `tokens.css` (PTL design tokens), `reset.css`, `global.css`
- `src/consts.ts` — site metadata and social links
- `public/` — copied verbatim to the site root. Holds the earlier static
  concepts at their original URLs: `/1/`–`/7/`, `/lyrics/`, `/full-site/`,
  and the previous holding page at `/coming-soon/`.

Note: the dev server does not resolve directory indexes inside `public/`
(`/5/` 404s, `/5/index.html` works). `npm run preview` and production do.

TypeScript is pinned to 6.0.3 on purpose. TS 7 (the native compiler) does not
expose the programmatic API `astro check` and the Astro editor extension use —
see https://github.com/withastro/roadmap/discussions/1321. Unpin once Astro
supports it.
