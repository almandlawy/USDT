# Monitoring and incident response

## Public health
`GET /api/health` returns only:
- `status`
- `service`
- `liveTradingLocked`
- `checkedAt`

## Internal health
`GET /api/internal/health`
- Bearer `INTERNAL_HEALTH_TOKEN`, or
- Staff session with AAL2

## Live trading lock conflict
If env and database disagree, public health is `degraded` and trading remains fail-closed.

## Incident steps
1. Confirm `/api/health` and internal health.
2. Freeze feature flags / keep LIVE_TRADING false.
3. Rotate compromised secrets.
4. Review `audit_logs` and `login_events`.
5. Communicate via support tickets — do not expose stack traces to customers.
