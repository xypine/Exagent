# Backlog

## Landing-page promises not yet fulfilled

- Score every discovered person against the seeker profile, rather than only
  the current top-five decision-power candidates.
- Provide a single, globally ranked shortlist ordered by match score instead
  of keeping people grouped in company-discovery order.
- Give every shortlisted person the promised 0–100 score, confidence,
  rationale, outreach angle, and missing-information summary.
- Render the API's score-factor breakdown and `missing_info` in the results
  UI, so the claimed transparent rationale and visible evidence gaps are
  actually visible.
- Extend public-background research to support publications, talks, and
  interviews, and show those findings alongside work history, education, and
  community activity.
- Return and display the promised person-level industry, location, and useful
  contact method (for example a verified LinkedIn profile or email), rather
  than only a generic profile URL.
- Attach usable source links or citations to scoring rationales and outreach
  angles, not only to separate company and background-research views.
- Move the optional seeker profile into the initial search flow, or revise the
  "How it works" copy to reflect that it is entered after the company search.
- Reconcile the "no personal data asked" claim with the optional profile
  field, which is persisted in browser local storage; either change the copy
  or provide an explicit no-storage option.

## Reliability

- Bound and evict inactive client buckets in the in-memory rate limiter. Each
  caller-controlled UUID currently creates a bucket that is retained for the
  lifetime of the process.
- Validate the stored anonymous client UUID and regenerate it when malformed
  (or when the API rejects it), so a corrupted local-storage value does not
  leave the workspace unusable.
