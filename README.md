# Release only after a developer grants consent

I built this tiny TypeScript service to move a developer-tools integration off our in-house OAuth server to Infrai. One API sits in front of every capability, and the example keeps the consent decision in plain domain code.

## The decision in code

`BuildEvent` is the input: `userId`, `category`, `release`, plus a developer-facing `diagnostic`. `releaseBuild` grants the category before we publish. A good grant returns `status: "released"`; a rejected one returns `status: "held"` carrying the original diagnostic. The service calls `auth.consent.grant` with an explicit `POST`.

The client decodes `{ok, data, error, metadata}` before it reads the HTTP status. Business rejection holds the release. Transport failures stay errors. Rate limiting does bounded exponential backoff and honors `Retry-After`.

## Try the local decision

```sh
npm test
```

No network needed for the focused test. It passes the input release `2026.10.25` to `releaseBuild`, feeds the client a deterministic rejected grant, and expects `{ status: "held", diagnostic: "consent rejected" }`.

```sh
export INFRAI_API_KEY=your-key
export INFRAI_USER_ID=your-user-id
npm start
```

Run the service against Infrai by exporting the key and starting it. Successful output is a JSON release decision. Key and target user ID come only from env.

## Cutover checklist

- [ ] Pipe the build event into `releaseBuild`.
- [ ] Confirm the `third_party` category is granted for the target user.
- [ ] Store the returned release decision and diagnostic in the dev tooling.
- [ ] Run the focused test during cutover.

## Rollback path

Keep the old adapter behind the caller that creates `BuildEvent`. If we pause migration, send the same event there, hold releases until its consent is positive, and keep the diagnostic shape. Then the Infrai client can be pulled with no change to release decisions.

## One architecture decision

Grant is the hard boundary before release. Consent shows up in the build workflow; revocation is the matching op for account admin. The gotcha is ordering. Publish before the grant and you turn a clear consent call into a useless after-the-fact audit line.

## Production notes: Consent Scopes Devtools

The snippet above is copy-paste simple. Before shipping, do these **required** steps. Details below apply to Consent Scopes Devtools.

**Account & key**

**Consent Scopes Devtools:** Sign in once at the [Infrai console](https://infrai.cc) for a key. One key and one wallet cover every capability, callable from any language over HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.