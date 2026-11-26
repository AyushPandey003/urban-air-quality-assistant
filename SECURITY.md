# Security policy

## Reporting

Use the repository's private vulnerability reporting feature if available. Otherwise contact the repository owner privately before publishing exploit details. Never include an API key or a person's location in a public issue.

## Trust boundaries

- The website is a static export. OpenAQ credentials are available only to the refresh/build steps in GitHub Actions, never browser requests.
- Public observation snapshots are untrusted input: a shared Zod schema validates finite non-negative concentrations, coordinates, identifiers and timestamps at publication and consumption.
- React renders station names and answers as text. No HTML from user questions or upstream data is injected.
- Questions are length-limited and processed locally. Optional browser speech recognition can transmit audio to the browser vendor. Geolocation requires an explicit click and is used only to match a supported city.
- Third-party map tiles reveal the requested map area and ordinary network metadata to their providers. Do not describe the app as entirely offline or anonymous.

## Supply chain and deployment

- Lockfile-based installation, dependency audit gates, SHA-pinned workflow actions and weekly Dependabot updates.
- Pull-request checks receive no OpenAQ secret. Deployment only proceeds after quality gates pass.
- Export scanning rejects the configured OpenAQ key and common GitHub-token patterns if found in published files. This is an additional safeguard, not a complete secret scanner.
- Each exported HTML page receives a Content Security Policy with hashes for Next.js inline scripts. Map workers require `blob:` and WebAssembly; dynamic map styling requires inline styles. Arbitrary inline JavaScript is not allowed by the generated policy.
- GitHub Pages cannot provide arbitrary HTTP response headers. In particular, a meta CSP cannot enforce `frame-ancestors`; do not claim full header-based hardening. A reverse proxy would be needed for those controls.
- Upstream failure never deliberately publishes credentials or fabricates successful observations. Old city snapshots retain their original fetch and measurement times.

Run `npm audit` regularly. A clean audit is time-dependent and does not prove the absence of vulnerabilities. Rotate `OPENAQ_API_KEY` in the repository secret if it is ever exposed.
