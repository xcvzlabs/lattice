<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Architecture', sectionOrder: 2, title: 'Model Registry & Routing', order: 3 },
  });

  useSeoMeta({
    title: 'Model Registry & Routing',
    description:
      'How a client-facing model name resolves to a provider call, in what order, and by what strategy.',
  });

  const registryEntry = `{
  id: 'gpt-4o',
  provider: 'openai',
  providerModel: 'gpt-4o',
  fallbacks: ['claude-sonnet', 'gemini-pro'],
  pricing: { inputPerMillionUsd: 2.5, outputPerMillionUsd: 10 },
}`;

  const costFormula = `cost = (promptTokens / 1_000_000) × inputPerMillionUsd
     + (completionTokens / 1_000_000) × outputPerMillionUsd`;
</script>

<template>
  <DocPage>
    <ProseH1 id="model-registry-routing">Model Registry &amp; Routing</ProseH1>

    <ProseH2 id="the-registry">The registry</ProseH2>
    <p>
      Models are declared once, centrally, in
      <ProseCode>apps/gateway/server/registry/models.config.ts</ProseCode>:
    </p>
    <CodeBlock
      language="ts"
      filename="models.config.ts"
      :code="registryEntry"
    />

    <FieldGroup>
      <Field
        name="id"
        type="string, required"
      >
        The stable, client-facing model name (what goes in the request's
        <ProseCode>model</ProseCode> field).
      </Field>
      <Field
        name="provider"
        type="'openai' | 'anthropic' | 'google' | 'ollama' | 'vllm'"
      >
        Which adapter serves this model. Must have credentials configured — see
        <ProseA href="/providers/overview">Providers</ProseA>.
      </Field>
      <Field
        name="providerModel"
        type="string, required"
      >
        The upstream model name actually sent to the provider (e.g.
        <ProseCode>claude-sonnet-4-5</ProseCode>).
      </Field>
      <Field
        name="fallbacks"
        type="string[], optional"
      >
        An ordered list of other registry <ProseCode>id</ProseCode>s to try if this one's provider
        fails. Flat, not recursive — a fallback's own <ProseCode>fallbacks</ProseCode> are not
        chained in.
      </Field>
      <Field
        name="aliases"
        type="string[], optional"
      >
        Extra names a client may request that resolve to this exact entry (e.g.
        <ProseCode>company/smart</ProseCode>). An alias can never resolve to a different entry, and
        can't itself be used as a fallback target.
      </Field>
      <Field
        name="pricing"
        type="{ inputPerMillionUsd, outputPerMillionUsd }, optional"
      >
        Static USD-per-million-token pricing, used only for cost-aware ranking and cost estimation
        on request logs. A model with no pricing still works — it just never wins a
        <ProseCode>cost</ProseCode> or <ProseCode>balanced</ProseCode> sort and its request logs
        show no <ProseCode>estimated_cost_usd</ProseCode>.
      </Field>
    </FieldGroup>

    <ProseH3 id="boot-time-validation">Boot-time validation</ProseH3>
    <p>
      The registry is validated once, at module load — before the server accepts any request. Any of
      the following crashes startup with a <ProseCode>model_registry_invalid</ProseCode> error
      instead of surfacing as a runtime failure on some unlucky request:
    </p>
    <ProseUl>
      <ProseLi>Duplicate <ProseCode>id</ProseCode> across entries.</ProseLi>
      <ProseLi>
        An <ProseCode>alias</ProseCode> colliding with an existing <ProseCode>id</ProseCode>, or
        duplicated across entries.
      </ProseLi>
      <ProseLi
        >A model listing its own <ProseCode>id</ProseCode> in its own
        <ProseCode>fallbacks</ProseCode> (self-reference).</ProseLi
      >
      <ProseLi>
        A <ProseCode>fallbacks</ProseCode> entry that doesn't match any known
        <ProseCode>id</ProseCode> (aliases are not valid fallback targets).
      </ProseLi>
      <ProseLi
        >The same fallback listed twice in one entry's <ProseCode>fallbacks</ProseCode>.</ProseLi
      >
      <ProseLi>
        A <ProseCode>provider</ProseCode> with no configured credentials (see
        <ProseA href="/providers/overview">Providers</ProseA> for what "configured" means per
        provider).
      </ProseLi>
    </ProseUl>

    <ProseH2 id="resolving-a-request">Resolving a request</ProseH2>
    <ProseOl>
      <ProseLi>
        <strong>Lookup</strong>: <ProseCode>lookupModel(registry, request.model)</ProseCode> matches
        against every entry's <ProseCode>id</ProseCode> first, then every entry's
        <ProseCode>aliases</ProseCode>.
      </ProseLi>
      <ProseLi>
        <strong>Candidate order</strong>: <ProseCode>[primary, ...primary.fallbacks]</ProseCode>,
        flattened — the order declared in the config, unless overridden by strategy.
      </ProseLi>
      <ProseLi>
        <strong>Circuit filter</strong>: candidates whose provider is currently
        <ProseCode>open</ProseCode> are dropped. If that would leave zero candidates, the
        <em>original, unfiltered</em> order is used instead — a stuck circuit should never be worse
        than no circuit breaker at all. See
        <ProseA href="/architecture/failover-and-circuit-breaking"
          >Failover &amp; Circuit Breaking</ProseA
        >.
      </ProseLi>
      <ProseLi>
        <strong>Strategy reorder</strong>: the remaining candidates are sorted by the application's
        <ProseCode>routingStrategy</ProseCode>.
      </ProseLi>
      <ProseLi>
        <strong>Attempt loop</strong>: candidates are tried in the resulting order until one
        succeeds or all are exhausted. See
        <ProseA href="/architecture/request-lifecycle">Request Lifecycle</ProseA> for retry
        semantics.
      </ProseLi>
    </ProseOl>

    <ProseH2 id="routing-strategies">Routing strategies</ProseH2>
    <p>
      An application can pin a <ProseCode>routingStrategy</ProseCode> (set through the
      <ProseA href="/management-api/applications">Management API</ProseA>):
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Strategy</ProseTh>
          <ProseTh>Candidate order</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>unset (default)</ProseTd>
          <ProseTd
            >The registry's declared <ProseCode>[primary, ...fallbacks]</ProseCode> order.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>cost</ProseCode></ProseTd>
          <ProseTd>Ascending blended <ProseCode>$/M</ProseCode> input+output price.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>latency</ProseCode></ProseTd>
          <ProseTd>Ascending rolling-average latency per model.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>balanced</ProseCode></ProseTd>
          <ProseTd>
            Cost and latency, each min-max normalized to <ProseCode>[0, 1]</ProseCode>, then
            averaged evenly (<ProseCode>0.5 × cost + 0.5 × latency</ProseCode>).
          </ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      A candidate with no price or no latency sample yet is still tried — it just sorts after every
      candidate that has a real score, rather than being dropped. Ties and fully-unscored groups
      preserve their original relative order (a stable sort).
    </p>

    <ProseH2 id="latency-tracking">Latency tracking</ProseH2>
    <p>
      Every successful provider call records its latency against
      <ProseCode>providerLatencyState</ProseCode>, keyed by the registry model
      <ProseCode>id</ProseCode>, as a rolling average. That average is what
      <ProseCode>latency</ProseCode> and <ProseCode>balanced</ProseCode> strategies sort on. It's
      periodically synced across gateway instances the same way circuit breaker state is — see the
      next page.
    </p>

    <ProseH2 id="cost-estimation">Cost estimation</ProseH2>
    <p>
      <ProseCode>estimateCost(entry, usage)</ProseCode> returns
      <ProseCode>undefined</ProseCode> unless the entry has <ProseCode>pricing</ProseCode>
      <em>and</em> the response reported both <ProseCode>promptTokens</ProseCode> and
      <ProseCode>completionTokens</ProseCode>:
    </p>
    <CodeBlock
      language="text"
      filename="text"
      :code="costFormula"
    />
    <p>
      This value is what populates <ProseCode>estimated_cost_usd</ProseCode> on request logs and the
      usage summary endpoints.
    </p>
  </DocPage>
</template>
