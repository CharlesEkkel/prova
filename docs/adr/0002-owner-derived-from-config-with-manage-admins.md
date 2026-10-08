# Owners are derived from deployment config, and only they hold `manage-admins`

Anyone with `manage-users` could otherwise edit a Role they hold, or grant themselves Admin, and escalate. So a sixth Permission, `manage-admins`, gates everything that grants, revokes or touches `manage-users`, and only an **Owner** holds it. Owner is not a stored grant: it is derived live from the owner emails the deployment passes on every deploy (a verified Google email match), so removing an address demotes that person to Admin on the next request. Enforcement is in the database, not the UI.

## Considered Options

- **One Admin that persists once granted** (the original design): simpler, but a leaked or over-trusted Admin could promote others without limit, and changing the config never changed who held power.
- **Owner as a stored grant, managed in the app:** easy to revoke in the UI, but the deployment config would no longer be the single source of truth, and there would be a last-Owner problem to guard against.

## Consequences

- Owners cannot be removed or have their Roles changed in the app; remove the email from the deployment instead.
- No Role or Invite Link may hold `manage-admins`.
- Becoming an Owner also stores an Admin grant, so a removed Owner stays an Admin.
