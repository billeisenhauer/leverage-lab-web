---
title: "Methodology and assumptions"
description: "What the model calculates, what it deliberately leaves out, and how to disagree with it."
permalink: /methodology/
---

Leverage Lab is a teaching model. It makes one proposition inspectable: increasing capacity at a non-constraint can increase work-in-progress, rework, and demand for human attention without increasing accepted outcomes.

## Unit of value

The model counts an item only when it passes through adoption and receives durable ownership. Code produced, pull requests opened, components shipped, and partner deliverables completed are intermediate inventory.

## Pipeline

The simulated system has six stages:

1. **Shape** — decide what outcome matters and bound the work.
2. **Full Kit** — assemble authoritative context, interfaces, acceptance evidence, risk classification, and an owner.
3. **Build** — implement with human, agent, foundation, or partner capacity.
4. **Verify** — evaluate correctness, safety, fitness, and maintainability.
5. **Integrate / Release** — merge shared changes and release with confidence.
6. **Adopt / Own** — migrate consumers, change behavior, and sustain the result.

Each stage has a queue, sustainable weekly capacity, first-pass yield, human-attention cost, and telemetry coverage. A deterministic seed introduces bounded weekly variation while keeping repeated runs comparable.

## Constraint calculation

The model’s governing constraint is the active stage with the lowest yield-adjusted sustainable capacity:

```text
effective capacity = sustainable capacity × first-pass yield
```

The perceived constraint is different. It is estimated from queue pressure, visible activity, quality loss, and telemetry coverage. Missing events and low coverage introduce noise. This is why the initial scenario can make Build look loud while Verify governs accepted outcomes.

## Intervention relationships

The simplified causal relationships are:

```text
agent build capacity
  = base capacity × concurrency × context quality × task evaluability

partner net capacity
  = partner output
    − internal shaping
    − review and integration
    − handoff absorption

foundation net capacity
  = adopted consumers × repeated effort removed
    − build, migration, support, and retirement cost
```

Instrumentation consumes Leverage points but adds no physical stage capacity. Its modeled value is increasing diagnosis confidence before the next intervention.

## What is intentionally absent

The simulator does not contain company data, financial forecasts, team-performance benchmarks, story points, lines of code, prompt counts, AI-seat utilization, or claims about a specific organization’s constraint.

Its constants are illustrative. A real operating system would replace them with event-linked evidence from opportunity shaping through adoption, then test whether intervention, consumer behavior, system outcome, and business capacity form a defensible proof chain.

## How to challenge the model

A useful model should expose what would change its author’s mind. Leverage Lab would be weakened if repeated evidence showed that:

- local capacity increases reliably produced proportional accepted outcomes without downstream costs;
- adoption and ownership had no material effect on realized platform or partner value;
- incomplete telemetry did not affect intervention selection;
- human evaluation capacity scaled automatically with agent output; or
- constraints remained stable enough that periodic re-diagnosis had no value.

The source is intentionally small and inspectable. Change a capacity, yield, coverage level, or intervention effect and rerun the same seed.
