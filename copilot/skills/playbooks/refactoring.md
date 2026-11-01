# Refactoring

You own the contract. Structure changes, behavior doesn't. If the cleanup reveals a bug or a missing feature, split it out and do the structural change first.

1. Pin the behavior before moving anything. Tester writes a characterization test, snapshot or equivalence script that captures current behavior. Type-check and lint are not a pin.
2. Name the structure the code is missing, per the model-the-domain principle. The reshape must delete branches or invalid states, not add indirection. Boring code stays if it's already clear and local.
3. Name the target shape: module layout, types and call graph as if built today. If it crosses a function boundary, run the arena skill on the shape first.
4. Subtract before you add. Delete dead code, collapse one-caller wrappers, drop redundant validators, then introduce the new shape.
5. Move in small steps that keep the pin green. For API reshapes, migrate every caller and delete the old API in the same pass. No shims, no parallel old and new paths. For more than a handful of mechanical edits, have Builder write a codemod or script rather than hand-editing (the build-the-lever principle). Check renames against strings, docs and config, not just code.
6. Prove behavior is unchanged with the pin, not "it compiles".
7. Confirm it's worth keeping. The measure is lower reader load (the minimize-reader-load principle). If the diff doesn't make anything easier to read, revert it.

**Reply.** The structure that changed, the pin it held against, the equivalence proof, the reader-load improvement, and anything reverted. No new behavior.
