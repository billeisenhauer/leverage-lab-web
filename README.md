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

## Analytics

Production analytics uses GA4 only after explicit visitor consent. Local
development never loads the Google tag. Alongside automatic page views, the
simulator emits these custom events:

| Event | Meaning |
|---|---|
| `simulation_started` | First intervention, prediction, or hint in a run |
| `cycle_run` | One six-week cycle completed |
| `simulation_completed` | All four cycles completed |
| `scenario_selected` | A scenario was selected or restarted |
| `guidance_mode_changed` | Easy or Hard mode was selected |
| `help_opened` | The how-to-play guide was opened |
| `hint_requested` | A contextual hint was requested |

Event parameters contain model state such as scenario, cycle, intervention IDs,
prediction, modeled constraint, outcome rate, and guidance mode. They do not
contain free-form or intentionally identifying input.
