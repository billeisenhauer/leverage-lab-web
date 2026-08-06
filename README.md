# Leverage Lab

A company-neutral, deterministic constraint simulator for human-agent software
delivery systems.

## Local development

```bash
./dx/init
./dx/build
./dx/start
```

Open the URL printed by `dx/start`. Run `./dx/test` before publishing and
`./dx/stop` when finished.

## GitHub Pages

1. Create or connect the GitHub repository.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Push `main`; `.github/workflows/deploy.yml` builds and publishes the site.
4. The default project URL is `https://billeisenhauer.github.io/leverage-lab-web/`.
5. If you later configure a custom domain, update `url` and clear `baseurl` in
   `_config.yml`.

The published site is intentionally company-neutral. Do not add private
research, internal data, credentials, or company-specific assumptions.
