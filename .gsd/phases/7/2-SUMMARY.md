# Plan 7.2 Summary: Update README with Final v1.1 Metrics + compare_results.py Fix

## What was done
1. **README Metrics Table**: Updated both baseline and trained metrics tables in `README.md` to reflect the final evaluated numbers (using self-match in same-modal evaluation) and added the MRR (Mean Reciprocal Rank) column.
2. **README Dependency Info**: Updated the `pip install` commands in the installation guide to include the `torchgeo` package.
3. **README System Description**: Refreshed the architecture overview to outline the v1.1 improvements (torchgeo backbones, modality-specific projection heads, 4-channel multispectral input, and Z-score normalization).
4. **Compare Results Script**: Modified `scripts/compare_results.py` to compare and display the MRR metrics across all 4 retrieval modes and print a clear `HEADLINE:` comparison output highlighting cross-modal retrieval performance.

## Verification Results
- Ran `python scripts/compare_results.py` successfully showing the MRR table:
  - `SAR -> OPT` MRR: 0.0156 -> 0.7063 (+0.6908)
  - `OPT -> SAR` MRR: 0.0171 -> 0.6927 (+0.6756)
- The verification script checked for 'MRR', 'torchgeo', and lack of old numbers in the README and passed successfully.
