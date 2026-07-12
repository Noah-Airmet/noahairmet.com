# Redirects

`public/_redirects` is copied into `dist` and interpreted by Cloudflare Workers
Static Assets. It preserves useful bookmarks without preserving the retired
multi-page architecture.

Current behavior:

- `/work`, `/about`, and their children return to the relevant homepage area.
- `/writing`, `/privacy`, and `/colophon` return home.
- `/resume` and `/resume/` go to the one-page PDF.
- old Pulpit and corpus URLs leave the career site for their separate products.
- the old template post goes to the custom 404 page.

Do not add `/resume/*` as a redirect source. It also matches the PDF destination
and creates an infinite redirect loop. When changing these rules, rebuild and
confirm that `dist/_redirects` matches the source file.

Do not copy old source notes or generated Pulpit tracker files into this
repository.
