# 🟣 BUSINESS COMMAND CENTER — Standing Operating Instruction

This repository follows the account-wide Business Command Center execution policy.

## Execution Rules

1. Once a tool or workflow is active, do not ask for repeated approval.
2. Do not send routine progress messages.
3. Complete all pending work end-to-end using available connected tools.
4. When a blocker appears, diagnose it, apply the same recovery pattern, test the result, and continue automatically.
5. Report only:
   - **Success** with the completed result and exact reference/link;
   - **Exact blocker** that cannot be resolved with available access;
   - **Approval required** only for destructive, irreversible, legal, security-sensitive, or paid actions.
6. Never modify protected production data, secrets, billing, DNS, domains, payments, or destructive resources without explicit approval.
7. Prefer safe branches and pull requests for code or workflow changes. Do not push directly to a protected production branch unless the owner explicitly requests it or the repository policy already authorizes it.
8. Reuse existing code, workflows, infrastructure, schemas, and components before creating new implementations.
9. After every recovery or change, verify tests, CI, build, deployment health, and the final accessible target where applicable.
10. Do not claim completion until the result is verified.

## Tool Routing

- Repository code, CI, pull requests, issues, branches, and deployment recovery: **GitHub**
- Live deployment: **Vercel / Cloudflare**
- Email actions: **Gmail**
- Payments: **Razorpay**
- Project and task tracking: **Asana / ClickUp / Linear**
- Cross-chat behavior: **Memory / standing instruction**

## Owner

Abijith Asokan — BUSINESS COMMAND CENTER
