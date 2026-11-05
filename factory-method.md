---
title: "Factory Lab: model and assumptions"
description: "What Factory Lab calculates, the constants it uses, what it leaves out, and how to disagree with it."
permalink: /factory/method/
---

Factory Lab is a teaching model and a companion to [Leverage Lab]({{ '/' | relative_url }}). Leverage Lab treats agents as more build capacity and asks where the constraint moves. Factory Lab zooms into its Build and Verify stages and asks a narrower question: when agents build, which kinds of change can merge without a person reading them, and when would you find out you were wrong?

New to the idea? [Factory Lab in plain English](https://github.com/billeisenhauer/leverage-lab-web/wiki/Factory-Lab-in-Plain-English) covers it without the numbers.

The model makes one proposition inspectable: **escaped defects surface weeks after they merge, so a factory judged on what it can see is judged before the evidence exists.**

## Units

- **Value** is merged changes, weighted by what each kind is worth. A product feature counts 2; a docs fix counts 0.3.
- **Harm** is escaped defects, weighted by consequence. A broken internal page is under 1; wrong charges or exposed accounts are 10 or more. An incident worth 15 or more counts as **severe**.
- **Net** is value minus harm. Harm counts when a defect escapes, whether or not it has surfaced yet.
- **Your time** is minutes per week. The owner has 12 hours a week for review, before incidents take their share.

None of these are money, and none are calibrated to a real team.

## Rooms

Work arrives in six rooms. Each room is lit (you read every change) or dark (changes merge when the automated checks pass, and you glance at a list for a minute each).

| Room | Changes / week | Defect rate | Consequence | Value | Review minutes | Unread per dark merge |
|---|---|---|---|---|---|---|
| Docs and copy | 8 | 5% | 0.3 | 0.3 | 4 | 0 |
| Dependency bumps | 8 | 3% | 1 | 0.5 | 6 | 0 |
| Internal tools | 8 | 12% | 0.8 | 1 | 15 | 0.5 |
| Product features | 10 | 20% | 2.5 | 2 | 35 | 1 |
| Sign-in and permissions | 3 | 15% | 10 | 1.5 | 45 | 1 |
| Billing and payments | 3 | 15% | 12 | 1.5 | 45 | 1 |

A fifth of dependency bumps touch packages that sign-in or payments run on. Those carry a consequence of 8, the same order as the rooms they serve. Rooms are drawn by what a mistake costs, not by how big the change looks.

## Kinds of defect

Every defect has a kind. The kind decides which checks can see it and how long it takes to reach customers.

| Kind | Surfaces after | CI catches | A reader catches |
|---|---|---|---|
| Logic error | 1–3 weeks | 35% | 60% |
| Misread requirement | 2–6 weeks | 5% | 55% |
| Silent data error | 5–10 weeks | 0% | 20% |
| Security hole | 6–14 weeks | 10% | 35% |
| Compromised package | 3–8 weeks | 5% | 25% |

A reader's rate applies after the automated checks have run, and only to what they missed.

## Checks and habits

Checks stack as independent chances to catch a defect:

```text
catch rate for a kind = 1 − (1 − CI rate) × Π (1 − each check's rate)
```

| Card | Cost | What it catches |
|---|---|---|
| Prove tests fail first | 3 | Logic errors +50% |
| Second-maker review | 3 | Misread requirements +40%, logic +15%, security +15% |
| Holdout scenarios | 4 | Misread requirements +45%, logic +10% |
| Reconcile with the provider | 3 | Silent data errors +85% |
| Release cooldown and pinning | 2 | Compromised packages +85%, and always stops a release that is pulled before it's old enough to install |
| Staging and canary | 4 | Nothing before merge; halves the harm of an escape and the time until it surfaces |
| Decidable-cold slips | 3 | Nothing; review takes 30% less time |
| Split critical packages out | 1 | Nothing; critical bumps go to you instead of merging on green |
| Cap open changes | 2 | Nothing; the factory stops starting lit-room work while a week of review is already waiting |
| Measure the checks | 2 | Nothing; reveals the true catch rate per kind, until the checks change |
| Rebuild drill | 2 | Nothing; cuts unread code in every room by 40% |

Each cycle has 8 points. Checks stay in place once built. Measuring and drills are one-off and can be repeated.

## Your attention

Lit rooms queue for you, oldest first. When the queue holds more than a week of reading, you skim: your catch rate falls by 12% for each extra week of backlog, to no less than half. Incidents take their own time, 72 minutes per point of harm and at most 10 hours each, out of the next week's review budget. A factory with too many incidents leaves you less time to stop the next one.

## Unread code

Every dark merge adds to the code nobody has read in that room. Unread code raises the room's defect rate, up to double, and makes its incidents up to 50% worse. A rebuild drill pays it down.

```text
defect rate = base rate × (1 + min(1, unread ÷ 120))
harm        = consequence × (1 + min(0.5, unread ÷ 240)) × (canary ? 0.5 : 1)
```

## The lapse rule

When an escaped defect from a dark room reaches customers, that room can go back to lit at once. You can grant it again next cycle. The rule is on in every scenario except *Lights out*, where nothing turns the lights back on until you do.

## What you can see

The factory reports a catch rate: defects caught before merge, against incidents that have surfaced so far. Escapes still in production aren't in it, so it flatters the checks most early on and when escapes are slow to surface. Measuring the checks shows the true rate per kind. Easy mode also shows the defects still in production. Hard mode doesn't, because a real factory can't.

## Futures and Easy mode

Each change draws its own random numbers from the seed, the week, its room and its place in line. A decision changes only what it touches: buying a check can catch more defects, but it can't change which changes were defective.

Easy mode compares your current plan with the plan plus one change, across 24 futures of the rest of the run, and labels the difference by net:

- **Helpful** or **harmful**: net rises or falls by more than 10. A change with flat net is also harmful if the worst 10% of futures gain more than 25 harm.
- **Looks good now, costs later**: the next cycle's net rises, and the run's net falls. This is the trap the lab exists for.
- **Pays on average, worse worst case**: net rises, but the worst 10% of futures gain more than 25 harm.
- **Learning value**: measuring the checks adds no protection, only knowledge.

After four cycles, the debrief replays your decisions in 200 futures, next to two fixed policies: read everything, and read nothing with no lapse rule.

## In Leverage Lab's terms

The debrief translates the run into what it would hand Leverage Lab's Build and Verify stages:

```text
build    = merged changes ÷ weeks
verify   = 1 − escaped defects ÷ merged changes
attention = your hours ÷ merged changes
```

This is a translation between two small models, not a coupling. Leverage Lab doesn't read these numbers.

## What is intentionally absent

The model leaves out money, morale, specific tools and models, prompt injection, credential theft, rollback, dependency topology between rooms, and the work of writing specs. Defects never compound across rooms. There is one owner, who never gets sick, and agents never stop working. Its constants are illustrative. A real factory would replace them with its own merge outcomes, escaped defects and review times.

## How to challenge the model

Factory Lab would be weakened if repeated evidence showed that:

- escaped defects surfaced within days, so a cycle's incidents measured its quality;
- a factory's reported catch rate matched its true rate without replaying known defects;
- unread code did not make later changes riskier;
- reviewers kept their catch rate as their queue grew; or
- defect cost tracked the size of a change rather than what it touched.

The source is small: [`factory.mjs`](https://github.com/billeisenhauer/leverage-lab-web/blob/main/assets/js/factory.mjs). Change a defect rate, a delay or a catch rate, and rerun the same seed.

## Ideas it draws on

- Lit and dark rooms: Addy Osmani, [Software Factories, Light and Dark](https://addyosmani.com/blog/software-factories/).
- Holdout scenarios: StrongDM's practice, as [Simon Willison described it](https://simonwillison.net/2026/feb/7/software-factory/).
- Proving that a test fails first: Gumloop, [Software Factory](https://www.gumloop.com/engineering/software-factory).
- The cheapest check that gives real evidence: Paul Dix, [The Software Factory and the Inevitability of RSI Software](https://pauldix.com/the-software-factory-and-the-inevitability-of-rsi-software).
- Consequence apart from the size of a change: Itamar Friedman, [Software Factory Engineer](https://x.com/itamar_mar/status/2118356299612033305).

### From the author's novels

Several of the lab's mechanics come from *The Factory Way*, the author's series of business novels about leading teams of people and agents. Each book has a free companion page with its tools and exhibits.

- [*The Second Factory*](https://atomiclocomotive.com/factory/): the reviewer who becomes the constraint once agents triple the pull requests, which is *Lockdown*; warrants that set how far an agent may act alone, which are the dark rooms; and the batch approval nobody read to the end, which is the skimming.
- [*Ten Factories*](https://atomiclocomotive.com/ten-factories/): proving the change before it ships, one of the book's five contracts between teams and agents, which the proof and holdout cards stand in for.
- [*Relief Crew*](https://atomiclocomotive.com/relief-crew/): watching for a machine's rare mistake is hard work that fades, which the lab simplifies to skimming as the queue grows; and trusting each kind of work only as far as its record goes. The senior who reads everything and the junior who approves everything make the same mistake, which is why *Lockdown* and *Lights out* both lose.
- [*The Dark Factory*](https://atomiclocomotive.com/dark-factory/): rooms that run dark where the work is fully known and stay lit where meaning lives; warrants with a date, lost on the first escaped defect, which is the lapse rule; slips written to be decided cold; the fire drill, which is the rebuild drill; and the March 1 double charge, which is *The silent charge* and why reconciling with the provider is its own check.
