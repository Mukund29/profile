# FinTrack — Project Brief

**BMAD Phase:** Analysis → Product Brief  
**Version:** 1.0 | **Date:** 2026-05-13  
**Status:** Approved  
**Author:** Product Team  
**Classification:** Internal — Product Development

---

## 1. Executive Summary

FinTrack is a cross-platform mobile application (iOS + Android) that gives individuals in India, the United States, and the United Kingdom a single, intelligent place to track daily spending, monitor net worth, enforce savings discipline, and generate actionable weekly, monthly, and annual financial reports — all behind a subscription of **$2.99/month billed annually**.

The app auto-populates transactions from bank SMS alerts (Android), Gmail/Outlook bank emails, and direct bank connections (Plaid, TrueLayer, RBI Account Aggregator), eliminating the friction of manual data entry that causes 90% of users to abandon traditional budgeting tools within 30 days.

---

## 2. Problem Statement

### 2.1 The Core Problem
Personal financial discipline fails not because people lack intent, but because tracking friction is too high. Existing solutions require either:
- **Manual entry** (Splitwise, spreadsheets) — users abandon within 2–4 weeks
- **Bank portal logins** — not aggregated, no budgeting layer
- **Complex apps** (YNAB, Mint) — steep learning curve, US-only depth, no India/UK parity

### 2.2 The Specific Gap
| Need | Current Options | Gap |
|------|----------------|-----|
| Auto-capture transactions from Indian banks | None at app scale | SMS parsing + AA framework |
| 50/30/20 budget enforcement | YNAB (complex), Mint (US only) | Simple, mobile-first, global |
| Net worth across multiple banks | Bank portals (siloed) | Unified view, on-demand fetch |
| Weekly discipline scoring | None | Proprietary discipline score |
| Export to Excel / Google Drive | None at this price point | Built-in, $2.99/mo |

### 2.3 User Pain Points (Primary Research Signals)
1. "I know I overspend but I only find out at month end" — reactive, not proactive
2. "My salary goes to three banks, I don't know my net worth" — fragmented visibility
3. "I set a budget in January, forgot it by February" — no accountability loop
4. "My bank app shows transactions but not if I'm on track" — data without context
5. "I export to Excel every month manually — it takes 2 hours" — automation gap

---

## 3. Proposed Solution

### 3.1 Product Vision
> **"Your financial co-pilot — always tracking, always honest, never judgmental."**

A lightweight, beautiful mobile app that:
- **Auto-captures** every transaction via SMS (Android), email, or bank API — zero manual entry for most users
- **Scores** financial discipline weekly against user-defined 50/30/20 (or custom) targets
- **Shows** real-time net worth with one tap across all connected bank accounts
- **Reports** weekly, monthly, and annually in the exact format users already use (Excel template)
- **Exports** directly to Google Drive with zero friction

### 3.2 Differentiators
| Feature | FinTrack | Competitors |
|---------|----------|-------------|
| India SMS parsing (HDFC, ICICI, SBI, Axis, Kotak) | ✅ | ❌ |
| RBI Account Aggregator integration | ✅ | ❌ |
| Multi-region bank sync (IN + US + UK) | ✅ | Partial |
| 50/30/20 discipline score (weekly) | ✅ | ❌ |
| Google Drive auto-export | ✅ | ❌ |
| E2E encryption + zero SMS storage | ✅ | ❌ |
| $2.99/mo price point (all features) | ✅ | ❌ (YNAB $14.99, Copilot $8.99) |

### 3.3 Value Proposition
- **For India users:** "The first app that actually reads your HDFC/ICICI SMS — no setup, no manual entry"
- **For US users:** "Plaid-powered budgeting with a discipline score, not just a transaction list"
- **For UK users:** "Open Banking connected, GDPR-safe, £2.40/mo for your entire financial picture"

---

## 4. Target Users

### 4.1 Primary Persona — "The Disciplined Aspirant"
- **Age:** 24–38
- **Income:** ₹50K–₹3L/mo (India) · $4K–$12K/mo (US) · £3K–£8K/mo (UK)
- **Situation:** Earning well, spending more than intended, saving less than desired
- **Goal:** Track spending, hit savings targets, understand where money goes
- **Tech comfort:** High — uses UPI, Google Pay, Revolut daily
- **Pain:** Tried spreadsheets and apps before; abandoned them within 6 weeks

### 4.2 Secondary Persona — "The Financial Planner"
- **Age:** 30–45
- **Situation:** Has savings goals (home purchase, child education, retirement), wants structured tracking
- **Goal:** Savings rate visibility, goal progress, annual review for tax planning
- **Key feature:** Annual report + Google Drive export for financial record-keeping

### 4.3 Tertiary Persona — "The Dual-Income Couple"
- **Age:** 28–40, married/partnered
- **Situation:** Two salaries, shared expenses, unclear who's spending what
- **Goal:** Combined net worth visibility, shared budget discipline
- **Key feature (v2):** Multi-user / family accounts

### 4.4 Anti-Persona (Not Building For)
- Users who want investment portfolio tracking (v2+)
- Users who want bill pay or money transfer (not a payments app)
- Users under 18 (financial regulatory requirement)
- Enterprise / business expense tracking

---

## 5. Market Opportunity

| Market | TAM | SAM (smartphone, banked, 18+) | SOM (Year 1 target) |
|--------|-----|-------------------------------|---------------------|
| India | 500M smartphone users | ~150M financially active | 300–500 users |
| United States | 270M smartphone users | ~220M banked adults | 400–600 users |
| United Kingdom | 55M smartphone users | ~50M banked adults | 100–200 users |
| **Total Year 1** | | | **~1,000 users** |

**Revenue at 1,000 subscribers:** $2.99 × 12 × 1,000 = **$35,880 ARR**  
**Revenue at 10,000 subscribers:** **$358,800 ARR**  
**Infrastructure cost at 1,000 users:** ~$71/mo (~2.5% of revenue) ✓

---

## 6. Success Metrics

### 6.1 Launch Metrics (Month 1–3)
| Metric | Target |
|--------|--------|
| App Store rating | ≥ 4.4 stars |
| Onboarding completion rate | ≥ 75% |
| Day-1 retention | ≥ 40% |
| Day-7 retention | ≥ 25% |
| Free trial → paid conversion | ≥ 35% |
| Bank connection rate | ≥ 40% of active users |

### 6.2 Growth Metrics (Month 3–12)
| Metric | Target |
|--------|--------|
| Monthly subscriber growth | ≥ 15% MoM |
| Day-30 retention | ≥ 20% |
| Annual churn rate | ≤ 25% |
| NPS score | ≥ 45 |
| Transactions auto-captured (vs manual) | ≥ 60% |

### 6.3 Product Health Metrics
| Metric | Target |
|--------|--------|
| Transaction parse accuracy | ≥ 92% |
| Balance sync uptime | ≥ 99.5% |
| App crash rate | < 0.1% of sessions |
| P95 screen load time | < 1.5 seconds |

---

## 7. Constraints and Assumptions

### 7.1 Constraints
| Type | Constraint |
|------|-----------|
| Regulatory | RBI data localisation (India data in ap-south-1) |
| Regulatory | GDPR compliance for UK/EU users |
| Regulatory | CCPA compliance for US users |
| Regulatory | Age gate ≥ 18 (financial services) |
| Platform | iOS has no SMS access — iOS auto-capture via email + bank APIs only |
| Platform | Apple Sign-In mandatory when Google OAuth is offered |
| Platform | Play Store requires SMS_READ declaration + financial app form |
| Financial | Plaid cost ~$0.30/connected account/month — scales with US user growth |
| Financial | Setu AA cost ~₹1–2/API call — managed via 24h cache |

### 7.2 Assumptions
- Users are willing to pay $2.99/mo for automated financial tracking
- Indian banks (HDFC, ICICI, SBI, Axis, Kotak) maintain consistent SMS formats
- Plaid / TrueLayer APIs remain stable and affordable at bootstrap scale
- Setu AA consent flow adoption grows as AA ecosystem matures in India
- Google Drive OAuth remains available without major API changes

---

## 8. Out of Scope (v1)

| Feature | Version |
|---------|---------|
| Investment / portfolio tracking | v2 |
| Loan / liability tracking | v2 |
| Bill reminders / due dates | v2 |
| Split transactions | v2 |
| Multi-user / family accounts | v2 |
| Recurring transaction detection (ML) | v2 |
| AI-powered spend anomaly alerts | v2 |
| Web dashboard | v2 |
| Apple Watch / widgets | v2 |
| CSV import from other apps | v2 |
| Tax report / CA export | v3 |

---

## 9. Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| India SMS format changes (banks) | Medium | High | Regex pattern registry, community-updated, ML fallback |
| Plaid pricing increase | Low | Medium | TrueLayer + AA as alternatives; manual fallback always available |
| Setu AA low adoption in India | Medium | Medium | SMS fallback designed from day 1 |
| App Store rejection (SMS permissions) | Low | High | Pre-submission review, Play Store financial app form, permission rationale screens |
| Low D30 retention | Medium | High | Weekly discipline score + push notifications drive habit loop |
| Competitor copies India SMS parsing | Medium | Low | First-mover brand + trust (18 months head start) |

---

## 10. Timeline (High-Level)

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Design & Spec | Weeks 1–3 | ✅ Complete (this document) |
| Backend Setup | Weeks 4–6 | Supabase + FastAPI + RevenueCat configured |
| Core MVP Build | Weeks 7–16 | Onboarding + Tracker + Dashboard + Reports |
| Bank Integration | Weeks 12–18 | Plaid (US) + TrueLayer (UK) + Setu AA (India) |
| Beta Testing | Weeks 19–21 | 50 beta users, India + US + UK |
| App Store Submission | Week 22 | iOS + Android submission |
| Launch | Week 24 | Public launch |

---

*Document references: [Architecture v4](2026-05-13-architecture-v4.md) · [Screen Flows](2026-05-13-screen-flows.md) · [Data Model](2026-05-13-data-model.md) · [Onboarding](2026-05-13-onboarding-flow.md)*
