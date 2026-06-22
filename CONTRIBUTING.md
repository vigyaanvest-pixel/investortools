# Contributing to VigyaanVest Trader Workspace

Thanks for wanting to help extend the project! Bug reports, ideas, and pull requests are
welcome.

## Report a bug / request a feature
Open an issue: **[New issue](https://github.com/vigyaanvest-pixel/investortools/issues/new/choose)**
and pick a template (Bug report or Feature request). Search first to avoid duplicates.

> **Security:** please do **not** file security vulnerabilities as public issues.
> Email **support@vigyaanvest.com** instead.

## Submit a pull request
1. **Fork** this repo (button at top-right of the GitHub page) and clone your fork.
2. Create a branch: `git checkout -b fix/short-description`.
3. Set up & run (details in [`docs/DEVELOPING.md`](docs/DEVELOPING.md)):
   ```
   npm install
   npm run build         # produces dist/
   npm run smoke         # optional automated load-unpacked checks (Chrome / Edge)
   ```
   Or just **Load unpacked** the repo folder in `chrome://extensions` (Developer mode) to test.
4. Keep changes focused; reference the issue you're addressing.
5. Push to your fork and open a **Pull Request against `main`**. Fill in the PR template.

## Code guidelines
- **Vanilla JS/CSS/HTML, no build framework.** Match the style of the surrounding code.
- **Security:** HTML-escape any externally-sourced or user-entered text before putting it in
  the DOM (use the existing `esc()` helper). Do all third-party fetches in the **background
  service worker**; never add remotely-hosted code.
- **Permissions:** don't add new `permissions` / `host_permissions` unless essential — and
  justify it in the PR (it affects store review).
- Run a quick smoke test in **both Chrome and Edge** when you can.

## Scope
This is a focused stock-research workspace (Deck / Grid / Calendar / The Tape / Dock). Small,
well-scoped improvements and fixes are easiest to accept. For larger ideas, open a feature
issue first so we can agree on direction before you build.

## Contribution terms (please read)
VigyaanVest Trader Workspace is **source-available but proprietary** — see [`LICENSE`](LICENSE).
By submitting a contribution (issue content, code, text, or other materials), you confirm that:

1. The contribution is your own original work and you have the right to submit it.
2. You grant **VigyaanVest** a perpetual, worldwide, royalty-free, irrevocable license to use,
   reproduce, modify, sublicense, and distribute your contribution as part of the project and
   its derivatives.
3. Your contribution becomes part of the project and is governed by the project `LICENSE`;
   it does not change the project's license to others, and it is not for sale.

You retain copyright to your own contribution, but grant VigyaanVest the rights above so the
project can use it. (This isn't legal advice; if you're contributing on behalf of an employer,
make sure you're authorized to grant these rights.)

— Thank you! · support@vigyaanvest.com · https://vigyaanvest.com
