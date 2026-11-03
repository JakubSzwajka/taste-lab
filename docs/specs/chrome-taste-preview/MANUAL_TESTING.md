# Manual testing

Current acceptance is desktop-only, from round-045 None: "we dont do mobile support at all. ignore it". The flow below retains the original desktop comparison. Historical phone measurements are not a support commitment.

1. Refresh the existing lab. Open round033, use full-width preview and dark mode. Flip A/B/C. Compare the canvas, sidebar, header, fields and raised panels. Switch to light mode to confirm the palette no longer differs.
2. Use the inner page icons to inspect Library, Compare, Theme and History. Search the sample library, fold entries, select an example, edit the caption and reason, and try the local submit. It must not append a real taste answer.
3. In Library, switch the sample prototype theme in Inspector. Its colors and Geist text should be unchanged when flipping the outer choices.
4. Open round034. Compare A and B at desktop width. Inspect row density, grouping and panel padding. Scroll the document to bring specimen controls above the real floating answer bar when needed.
5. Open round035 and compare A/B/C after fonts finish loading. Inspect the same text at the same sizes and weights. Read the longer question on Compare and the History table. The inner prototype should stay in Geist.
6. Record picks in the real answer bar only when ready. Preview actions must never write taste.jsonl.

No winner is applied automatically. Mobile is out of scope; historical phone findings remain unfixed. The desktop scope correction does not grant permission to restyle production.
