# Security Policy

Lattice sits in front of every application's AI traffic and holds every provider credential the gateway is configured with. We treat vulnerabilities in it as high priority and ask that you report them privately rather than through a public issue.

## Supported Versions

Lattice does not yet publish tagged releases. Security fixes are made against the latest commit on `main`, and there is no long-term support branch to backport to. If you're running a fork or an older commit, update to the current `main` before relying on any advisory being applicable to your deployment.

## Reporting a Vulnerability

**Do not open a public issue for a security vulnerability.** Report it privately through [GitHub Security Advisories](https://github.com/xcvzlabs/lattice/security/advisories/new). This opens a private channel between you and the maintainers where the report, discussion, and eventual fix stay hidden from the public until a coordinated disclosure is ready.

A useful report includes:

- The component involved (gateway auth, a specific provider adapter, routing/failover, the management API, the dashboard, and so on)
- Steps to reproduce, or a proof of concept
- The impact you believe the issue has, and any conditions required to trigger it
- Any suggested remediation, if you have one

### What to expect

- **Acknowledgment**: within 3 business days of your report.
- **Initial assessment**: within 5 business days, including a severity estimate and whether we can reproduce it.
- **Resolution timeline**: communicated once the issue is triaged, and scaled to severity. We'll keep you updated as the fix progresses.
- **Credit**: with your permission, we'll credit you in the published advisory once a fix ships.

We ask that you give us a reasonable window to investigate and patch an issue before any public disclosure, and that you avoid accessing, modifying, or exfiltrating data beyond what's necessary to demonstrate the vulnerability.

## Scope

In scope:

- Authentication and authorization: application API keys, management API keys, and the middleware enforcing them
- Anything that could expose a provider credential (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, self-hosted provider credentials) to a client
- Quota, rate-limit, or model-allowlist bypasses
- Request smuggling or injection through provider adapters or the management API
- Access control issues in the dashboard, including session handling and its proxy to the gateway's management API
- Dependency vulnerabilities with a realistic exploitation path in this codebase

Out of scope:

- Vulnerabilities in an upstream AI provider's own API or infrastructure (OpenAI, Anthropic, Google, or a self-hosted Ollama/vLLM deployment) — report those to the provider directly
- Denial of service through sheer traffic volume against a deployer's own infrastructure
- Issues that require an already-compromised provider credential, database, or `API_KEY_PEPPER`
- Social engineering against maintainers or contributors

## Disclosure Policy

We follow coordinated disclosure: once a fix is available, we publish a GitHub Security Advisory describing the issue, its impact, and the affected commit range. Lattice does not currently run a paid bug bounty program.
