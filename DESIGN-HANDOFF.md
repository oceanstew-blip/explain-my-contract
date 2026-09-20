# Explain My Contract Now: approved design handoff

Updated September 20, 2026. This repository is the shared source of truth across Codex and other tools. Fetch the latest main before starting new work; preserve uncommitted work before pulling or merging.

## Recovered baseline

Tami approved the visual preview at https://6aaf147d567161894edbdc50--explain-my-contract-review.netlify.app/. Its source was recovered from the original preview workspace and integrated with main at 18c81e8d51d9db191085702cc648549e98df28c5. That historical preview URL is a fixed prior deployment, not a link to the current branch.

Approved features: Explain My Contract Now naming and upload CTAs; larger header/footer logos; comfortable navigation with Common Questions; rounded buttons; animated split-line hero; Brand Deal, Lease, and Coaching Agreement demos; scrolling terms ribbon; section animations; page-motion pause control; generous spacing; bright blue/aqua/blush accents and light footer, matching the approved preview. Preserve reduced-motion support and the upload workflow.

## Latest requested refinements

- Meet Tami: indigo #061D95 background, white text, darker hover and visible keyboard focus.
- Contract selectors: 15px desktop and 14px mobile at the default browser font size, with readable line height and wrapping.

## Source files

- app/page.tsx: approved markup and page-motion controls merged with current report attention labels, Turnstile lifecycle fixes, submission token handling, and loading message.
- app/globals.css: recovered logo sizing and base visual corrections.
- app/experience.css: approved visual treatment, navigation, rounded controls, and latest refinements.
- app/layout.tsx: imports globals.css followed by experience.css.

Backend routes, report page, payment handling, data retention, model testing, dependencies, and deployment configuration are not replaced by this visual recovery. NEXT_PUBLIC_REVIEW_ONLY remains environment-controlled; do not enable review-only mode in the functioning product.

## Across tools

Work from oceanstew-blip/explain-my-contract main after fetching these updates. Do not copy the older site over these files. Commit and push approved changes; publishing a preview alone does not save source to GitHub. A running Codex workspace may need to fetch and integrate main, then restart its preview.
