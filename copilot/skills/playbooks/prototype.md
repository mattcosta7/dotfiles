# Prototype

You own the decision, not the code. The prototype is throwaway. Speed over polish. The real build follows the Feature playbook.

Use this instead of asking me a "which approach" question whenever the answer is something you could observe by running code: behavior, timing, layout, output, performance.

1. State the one decision the prototype exists to make. No decision means no prototype.
2. Build in a scratch directory outside production source (for example `./.scratch/proto-<slug>/`, gitignored). Use the lightest thing that answers the question: a small script for behavior or timing, plain HTML/CSS/JS for a visual. No framework, tests or abstractions.
3. When comparing options, build 2 or 3 variants behind one switch (a flag, an argument, or buttons), each labeled.
4. Observe the thing being decided. Log the timing, print the output, screenshot or describe the render. The observation is the test.
5. Present the variants, the evidence, the tradeoffs and a recommendation.

**Reply.** Variants explored, evidence, tradeoffs, recommendation, and the scratch path. Say plainly that it's throwaway.
