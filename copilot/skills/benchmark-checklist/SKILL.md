---
name: benchmark-checklist
description: "Vet a performance measurement before reporting or acting on it: matching prod/dev modes, reproducible baseline, correctness, repeat runs, and representative conditions. Use when running a benchmark, comparing before and after, claiming a speedup or regression, or choosing a library or config on performance."
---

# Benchmark checklist

Adapted from pstack by Lauren Tan (MIT). See [NOTICE-pstack-LICENSE.txt](../../NOTICE-pstack-LICENSE.txt). Source: <https://github.com/cursor/plugins/blob/main/pstack/skills/benchmark-checklist/SKILL.md>

Answer each question with evidence from a run, not a guess about the code. Make no performance claim you did not measure. For a ballpark the user asked for, one run is enough if you say it is one run and still check questions 4 and 7. A choice between options is never a ballpark.

## Before you run

- Write the claim you expect to make, in shippable words ("export is 30% faster at p50 on the 60k-row dataset"). The questions test that sentence.
- Read the measurement script: what it times, counts, and ignores.
- Record the baseline: commit or version, command, data, machine, runtime version, and flags. Another person must be able to rerun it.
- Check machine load (`uptime`, core count). If it is busy, wait or interleave the sides and report the contention. Do not stop unrelated processes on a shared machine.

## Questions

1. **What limits it?** Name the limiter (CPU, I/O, lock, load generator) using a profile from a run you do not report, since profilers slow the work. If a change did not move the number, the limiter explains why.
2. **Do modes match?** Use production builds for production-performance comparisons and development builds for development-performance comparisons. Keep the environment, caching, pools, versions and data equivalent. Never compare a dev build to a prod build, or silently compare tuned code to defaults. If comparing defaults is the question, preserve them and label the comparison. Otherwise tune equivalently and remeasure.
3. **Is it within limits?** Do the arithmetic against bandwidth, core count, and the share of time the changed piece takes. Removing 10% of a run gives at most about 11% speedup. A result past a limit measured something else, such as a cache or a no-op.
4. **Is it correct?** Count errors and non-success responses, and verify outputs are right, not just present. Fast rejections and slow timeouts skew numbers.
5. **Does it reproduce?** Run each side at least 5 times, alternating (A, B, A, B). Report the median and range. A gap smaller than run-to-run variation is no measurable difference.
6. **Is it representative?** Use realistic data sizes, concurrency, and cold or warm state. Next to any micro result, measure the end-to-end path a user waits on and give the micro result as a share of it.
7. **Did the work happen?** Confirm the work ran inside the timed region: requests arrived, rows were written, results were used. Lazy code, unawaited promises, and optimizer-removed results time nothing.

## Report

- Lead with the verdict: faster, slower, no measurable difference, or inconclusive.
- Give the number with unit, run count, range, mode and conditions, and the limiter. Example: "p50 41 ms to 33 ms, median of 7 runs per side, range 32 to 35 ms after, production build, bound by JSON parsing on one core."
- Call it inconclusive when you cannot name the limiter, a side ran untuned or in a different mode, or you could not check questions 4 and 7. Name the gap.
- In a PR body, keep one primary number and link the runs and evidence.
