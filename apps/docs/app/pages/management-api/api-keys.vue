<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Management API', sectionOrder: 5, title: 'API Keys', order: 3 },
  });

  useSeoMeta({
    title: 'API Keys',
    description: 'Issuing and revoking the per-application keys that authenticate against /v1.',
  });

  const listResponse = `{
  "data": [
    {
      "id": "...",
      "applicationId": "...",
      "keyPrefix": "lattice_sk_ab12cd34",
      "createdAt": "2026-08-01T00:00:00.000Z",
      "revokedAt": null,
      "lastUsedAt": "2026-08-21T09:14:02.000Z"
    }
  ]
}`;

  const createResponse = `{
  "apiKey": {
    "id": "...",
    "applicationId": "...",
    "keyPrefix": "lattice_sk_ab12cd34",
    "createdAt": "2026-08-21T09:00:00.000Z",
    "revokedAt": null,
    "lastUsedAt": null
  },
  "key": "lattice_sk_ab12cd34ef56gh78ij90kl12mn34op56qr78st90uv"
}`;
</script>

<template>
  <DocPage>
    <ProseH1 id="api-keys">API Keys</ProseH1>
    <p>
      This is where an application actually gets a credential it can use against
      <ProseCode>/v1/chat/completions</ProseCode>. Every endpoint here is scoped to one application
      (<ProseCode>{id}</ProseCode> in the path). For the generation/hashing mechanics themselves,
      see <ProseA href="/architecture/security#key-generation">Security</ProseA>.
    </p>

    <ProseH2 id="list-an-applications-keys">List an application's keys</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/applications/{id}/api-keys"
    />
    <CodeBlock
      language="json"
      filename="json"
      :code="listResponse"
    />
    <Warning>
      Only <ProseCode>keyPrefix</ProseCode> is ever returned — enough to recognize a key in a UI
      (<ProseCode>lattice_sk_</ProseCode> plus 12 characters), never enough to reconstruct it. The
      stored hash never leaves the server; the serializer that builds this response strips it
      explicitly. See
      <ProseA href="/architecture/security#storage-hash-not-the-key">Security</ProseA>.
    </Warning>

    <ProseH2 id="create-issue-a-key">Create (issue) a key</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="POST /management/v1/applications/{id}/api-keys"
    />
    <p>No request body. Response (200):</p>
    <CodeBlock
      language="json"
      filename="json"
      :code="createResponse"
    />
    <Note>
      <ProseCode>key</ProseCode> is the <strong>raw secret</strong>, returned exactly once, in this
      response only. It is never retrievable again — not through this API, not through the
      dashboard, not from the database (only its hash is stored). Capture it immediately and hand it
      to whoever owns the calling application; if it's lost, issue a new key and revoke the old one.
    </Note>
    <p>
      <ProseCode>404 not_found</ProseCode> if <ProseCode>{id}</ProseCode> doesn't match an existing
      application.
    </p>

    <ProseH2 id="revoke-a-key">Revoke a key</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="DELETE /management/v1/applications/{id}/api-keys/{keyId}"
    />
    <p>
      Returns the now-revoked <ProseCode>ApiKey</ProseCode> (with
      <ProseCode>revokedAt</ProseCode> set). <ProseCode>404 not_found</ProseCode> if there's no
      active key with that id under that application — revoking an already-revoked or nonexistent
      key is not idempotent-success, it's a <ProseCode>404</ProseCode>.
    </p>
    <p>
      Revocation is immediate: the next request authenticated with that key fails with
      <ProseCode>401 invalid_api_key</ProseCode>, since <ProseCode>verifyApiKey</ProseCode> only
      matches active (unrevoked) keys.
    </p>

    <ProseH2 id="rotating-a-key-without-downtime">Rotating a key without downtime</ProseH2>
    <Steps>
      <ProseH4>Issue a new key</ProseH4>
      <p>
        <ProseCode>POST .../api-keys</ProseCode> — capture the returned <ProseCode>key</ProseCode>.
      </p>

      <ProseH4>Deploy it</ProseH4>
      <p>
        Update the calling application's configuration/secret store with the new key, deploy, and
        confirm it's serving traffic successfully.
      </p>

      <ProseH4>Revoke the old key</ProseH4>
      <p>
        <ProseCode>DELETE .../api-keys/{oldKeyId}</ProseCode> once you've confirmed nothing is still
        using it.
      </p>
    </Steps>
    <p>
      An application can hold multiple simultaneously-active keys — nothing about creating a new one
      revokes the old one automatically, which is what makes this rotation safe to do without a gap.
    </p>

    <ProseH2 id="disabling-an-application-vs-revoking-its-keys"
      >Disabling an application vs. revoking its keys</ProseH2
    >
    <p>
      Revoking is per-key and granular. Setting <ProseCode>applications.disabled</ProseCode> (via
      <ProseA href="/management-api/applications#update-an-application">update application</ProseA>)
      is a single switch that invalidates every key that application has ever been issued, at once,
      without touching the <ProseCode>api_keys</ProseCode> rows individually — useful for an
      incident response ("cut this application off <em>now</em>") where enumerating and revoking
      keys one by one would be slower.
    </p>
  </DocPage>
</template>
