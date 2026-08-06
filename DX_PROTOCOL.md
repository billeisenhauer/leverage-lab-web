# DX Protocol

This Jekyll project uses the same containerized development surface as the
sibling `*-web` repositories.

## Commands

```bash
./dx/init   # Configure the local site name and ports
./dx/build  # Build the development image
./dx/start  # Start Jekyll with LiveReload
./dx/test   # Run model tests and a strict Jekyll build
./dx/stop   # Stop the development container
```

Ruby and Jekyll commands run inside Docker. Git commands run on the host.

## Publishing

The GitHub Actions workflow builds pull requests and deploys `main` to GitHub
Pages. Configure the Pages source as **GitHub Actions** in repository settings.
