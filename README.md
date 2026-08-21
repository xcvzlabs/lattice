# Lattice

> Centralized AI infrastructure for connecting applications to cloud and self-hosted models.

Lattice is an internal AI gateway that provides a unified interface for company applications to interact with multiple AI model providers.

Instead of integrating and managing credentials for OpenAI, Anthropic, Google, Ollama, and other providers independently, applications communicate with Lattice through a single API.

```text
                         Company Applications
                    ┌─────────┬─────────┬─────────┐
                    │         │         │         │
                    ▼         ▼         ▼         ▼
                  App A     App B     App C     App D
                    │         │         │         │
                    └─────────┴────┬────┴─────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │    Lattice    │
                           │               │
                           │  Unified API  │
                           │    Routing    │
                           │   Fallback    │
                           │   Policies    │
                           │    Usage      │
                           └───────┬───────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
                 ▼                 ▼                 ▼
              OpenAI           Anthropic          Google
                 │                 │                 │
                 └─────────────────┼─────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                       Ollama               vLLM
```

## Why Lattice?

Without a centralized AI gateway, every application needs to manage its own provider integrations:

```text
Application A ──→ OpenAI
Application B ──→ Anthropic
Application C ──→ Google
Application D ──→ Ollama
```

This makes provider credentials, model selection, routing, costs, and observability the responsibility of every application.

Lattice moves those concerns into a centralized infrastructure layer:

```text
Applications ──→ Lattice ──→ AI Providers
```

Applications can therefore use AI without being tightly coupled to a particular provider.

## Goals

Lattice is designed to provide:

- A unified API for AI providers
- Centralized provider credentials
- Model and provider routing
- Provider and model failover
- Support for cloud and self-hosted models
- Centralized usage and cost tracking
- Application-level authentication and authorization
- Rate limiting and quotas
- Observability across AI requests
- Stable model aliases for applications

## Architecture

Lattice consists of several logical components.

### API

The API is the primary interface consumed by applications.

Lattice aims to provide an OpenAI-compatible API where practical, allowing existing AI SDKs and clients to communicate with Lattice without requiring a custom integration.

Example:

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.LATTICE_API_KEY,
  baseURL: 'https://lattice.internal/v1',
});

const response = await client.chat.completions.create({
  model: 'company/smart',
  messages: [
    {
      role: 'user',
      content: 'Hello',
    },
  ],
});
```

The application only needs to know about Lattice.

It does not need to know which provider ultimately handles the request.

### Routing

Lattice determines how a request should be handled.

For example:

```text
company/smart
       │
       ├── Claude
       ├── GPT
       └── Gemini
```

Routing can eventually take into account:

- Model capability
- Provider availability
- Latency
- Throughput
- Cost
- Provider priority
- Application policies

### Provider Adapters

Each provider is implemented behind a common internal abstraction.

```text
providers/
├── openai/
├── anthropic/
├── google/
├── ollama/
└── vllm/
```

This keeps provider-specific APIs and behavior isolated from the rest of the gateway.

### Failover

Lattice can retry a request through another provider when the preferred provider is unavailable.

```text
                    company/smart
                          │
                          ▼
                      Provider A
                          │
                         ❌
                          │
                          ▼
                      Provider B
                          │
                         ✅
                          │
                          ▼
                       Response
```

The same concept can eventually be extended to model-level fallback.

```text
Preferred Model
      │
      ❌
      ▼
Fallback Model
      │
      ✅
      ▼
Response
```

### Model Aliases

Applications should not need to depend on specific provider model IDs.

Instead of:

```ts
model: 'anthropic/claude-sonnet-...';
```

applications can use stable company-owned aliases:

```ts
model: 'company/fast';
model: 'company/smart';
model: 'company/cheap';
model: 'company/vision';
model: 'company/reasoning';
```

Lattice controls what those aliases resolve to.

This allows the underlying model to change without requiring every application to be updated.

```text
company/smart
      │
      └── Current: Claude
              │
              └── Future: Gemini
```

## Cloud and Self-Hosted Models

Lattice is not limited to hosted AI providers.

It can provide a common interface for both external and internally hosted models.

```text
                    Lattice
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Cloud        Cloud         Local
       OpenAI      Anthropic      Ollama
          │            │            │
          ▼            ▼            ▼
       Provider     Provider      Model Server
```

This allows applications to use local or self-hosted models without implementing a separate integration.

## Usage and Observability

Because requests pass through Lattice, usage can be tracked centrally.

A request can be associated with:

- Application
- API key
- Model
- Provider
- Input tokens
- Output tokens
- Latency
- Status
- Estimated cost

This provides a foundation for:

- Usage dashboards
- Cost monitoring
- Application quotas
- Budget controls
- Provider performance analysis
- Request tracing

## Security

Provider credentials should remain within Lattice.

Applications authenticate with Lattice rather than directly with individual AI providers.

```text
Application
     │
     │ Lattice API Key
     ▼
  Lattice
     │
     │ Provider credentials
     ▼
AI Provider
```

This creates a centralized point for:

- Authentication
- Authorization
- API key management
- Rate limiting
- Model access policies
- Provider access policies
- Usage limits

## SDK

The Lattice API is the core platform.

An SDK can be provided as a convenience layer for applications that want a Lattice-specific developer experience.

For example:

```ts
import { Lattice } from '@company/lattice';

const client = new Lattice({
  apiKey: process.env.LATTICE_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'company/smart',
  messages: [
    {
      role: 'user',
      content: 'Hello',
    },
  ],
});
```

The SDK should remain a client of the public Lattice API rather than containing the gateway's implementation logic.

## Repository Structure

The project is organized as a monorepo so the API, SDK, and shared public contracts can evolve together.

```text
lattice/
├── apps/
│   ├── gateway/
│   └── dashboard/
│
├── packages/
│   ├── api-contract/
│   └── sdk/
│
├── package.json
```

The exact structure may evolve as the platform grows.

## Development

### Requirements

- Node.js
- bun

### Install

```bash
bun install
```

### Development

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Test

```bash
bun run test
```

## Project Principles

Lattice follows a few core principles.

### Provider agnostic

Applications should not be tightly coupled to a specific AI provider.

### API first

The API is the platform boundary. SDKs and other clients are built on top of it.

### Infrastructure over abstraction

Lattice should centralize operational concerns without unnecessarily hiding the capabilities of the underlying providers.

### Cloud and self-hosted

The architecture should support both external AI providers and internally hosted models.

### Stable application interfaces

Applications should be able to use stable model aliases and APIs while Lattice manages the underlying provider infrastructure.

### Progressive complexity

Lattice should start simple and gain capabilities as real internal requirements emerge.

It does not need to reproduce every feature of a large public AI gateway.

## Roadmap

The initial focus is a reliable internal AI gateway.

### Phase 1

- [x] OpenAI-compatible API
- [x] Application authentication
- [x] Model registry
- [x] OpenAI provider
- [x] Anthropic provider
- [x] Google provider
- [x] Streaming
- [x] Basic routing
- [x] Basic failover

### Phase 2

- [x] Ollama support
- [x] vLLM support
- [x] Model aliases
- [x] Usage tracking
- [x] Token accounting
- [x] Rate limiting
- [x] Application quotas
- [x] Provider health monitoring

### Phase 3

- [x] Cost-aware routing
- [x] Latency-aware routing
- [x] Advanced provider fallback
- [x] Management API
- [x] Dashboard
- [x] API key management
- [x] Advanced observability
- [x] Policy management

## Status

Lattice is an internal platform under active development.

The API, provider interfaces, routing behavior, and other components may change as requirements evolve.
