---
phase: 4
plan: 2
wave: 2
---

# Plan 4.2: Post-Training Embedding Extraction & Re-Evaluation

## Objective

After training the dual encoder, extract new embeddings using the trained model (replacing the frozen ResNet50 baseline), rebuild the FAISS index, and run full evaluation to measure the improvement in cross-modal F1@5 / F1@10 vs. the MVP baseline.

## Context

- `outputs/checkpoints/best_model.pt` — trained checkpoint from Plan 4.1
- `scripts/build_index.py` — needs a `--checkpoint` flag to load trained model
- `evaluation/evaluate.py` — reuse as-is with new index

## Tasks

<task type="auto">
  <name>Add --checkpoint flag to scripts/build_index.py for trained model extraction</name>
  <files>scripts/build_index.py</files>
  <action>
    Add a `--checkpoint` argument to `build_index.py`. When provided, load the `DualEncoder` 
    from the checkpoint instead of a standalone ResNet50. The DualEncoder's `encode_sar` 
    and `encode_optical` methods produce 512-d embeddings (not 2048-d).

    Add to the argparse section:
    ```python
    parser.add_argument("--checkpoint", type=str, default=None,
                        help="Path to trained DualEncoder checkpoint (.pt). "
                             "If not provided, uses pretrained ResNet50 baseline.")
    ```

    Add a conditional block before extraction:
    ```python
    if args.checkpoint:
        from models.dual_encoder import DualEncoder
        print(f"Loading trained DualEncoder from: {args.checkpoint}")
        ckpt = torch.load(args.checkpoint, map_location=device)
        
        # Infer embedding dim from checkpoint args if saved
        emb_dim = ckpt.get("args", {}).get("embedding_dim", 512)
        model = DualEncoder(embedding_dim=emb_dim, pretrained=False).to(device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        
        sar_encode_fn = lambda x: model.encode_sar(x)
        opt_encode_fn = lambda x: model.encode_optical(x)
        embedding_dim = emb_dim
    else:
        sar_encoder = ResNet50Encoder(in_channels=2, pretrained=True, freeze_backbone=True).to(device)
        opt_encoder = ResNet50Encoder(in_channels=3, pretrained=True, freeze_backbone=True).to(device)
        sar_encode_fn = lambda x: sar_encoder(x)
        opt_encode_fn = lambda x: opt_encoder(x)
        embedding_dim = 2048
    ```

    Update `FAISSRetriever` instantiation to use `embedding_dim` variable instead of hardcoded 2048.
    Update output directory to `outputs/index_trained` when checkpoint provided.
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python scripts/build_index.py \
        --checkpoint outputs/checkpoints/best_model.pt \
        --output-dir outputs/index_trained \
        --batch-size 16 --workers 0
    ls -la outputs/index_trained/
    python -c "
import numpy as np
sar = np.load('outputs/index_trained/sar_embeddings.npy')
opt = np.load('outputs/index_trained/opt_embeddings.npy')
print('SAR shape:', sar.shape)   # (1167, 512)
print('OPT shape:', opt.shape)   # (1167, 512)
assert sar.shape[1] == 512, 'Expected 512-d from DualEncoder'
print('PASS: Trained embeddings extracted')
"
  </verify>
  <done>
    - `build_index.py` with `--checkpoint` flag completes without error
    - `outputs/index_trained/` contains all required files
    - Embeddings are `(1167, 512)` (DualEncoder 512-d space, not 2048-d)
  </done>
</task>

<task type="auto">
  <name>Run evaluation with trained model and generate comparison report</name>
  <files>scripts/compare_results.py</files>
  <action>
    Create `scripts/compare_results.py` to compare MVP baseline vs. trained model:

    ```python
    """
    Compare evaluation results between MVP baseline and trained model.
    Usage: python scripts/compare_results.py
    """
    import sys
    import json
    import subprocess
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))


    def run_evaluation(index_dir):
        """Run evaluation and return results dict."""
        result = subprocess.run(
            ["python", "evaluation/evaluate.py", "--index-dir", index_dir, "--k", "5", "10"],
            capture_output=True, text=True
        )
        print(result.stdout)
        if result.returncode != 0:
            print("STDERR:", result.stderr)
        # Load saved results
        with open(f"{index_dir}/evaluation_results.json") as f:
            return json.load(f)


    def main():
        print("=" * 70)
        print("BASELINE (MVP ResNet50):")
        print("=" * 70)
        baseline = run_evaluation("outputs/index")

        print("\n" + "=" * 70)
        print("TRAINED (DualEncoder + InfoNCE):")
        print("=" * 70)
        trained = run_evaluation("outputs/index_trained")

        print("\n" + "=" * 70)
        print("IMPROVEMENT SUMMARY")
        print("=" * 70)
        modes = list(baseline.keys())
        for mode in modes:
            for k in [5, 10]:
                key = f"mean_f1@{k}"
                if key in baseline[mode] and key in trained[mode]:
                    base_f1 = baseline[mode][key]
                    train_f1 = trained[mode][key]
                    delta = train_f1 - base_f1
                    sign = "+" if delta >= 0 else ""
                    print(f"{mode:<20} F1@{k}: {base_f1:.4f} -> {train_f1:.4f} ({sign}{delta:.4f})")

    if __name__ == "__main__":
        main()
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    # First run evaluation on trained index
    python evaluation/evaluate.py --index-dir outputs/index_trained --k 5 10
    # Then compare
    python scripts/compare_results.py 2>&1 | grep -E "(IMPROVEMENT|->)"
    # Should show improvement in cross-modal F1 vs baseline
  </verify>
  <done>
    - Evaluation runs on `outputs/index_trained/` without error
    - Cross-modal F1@5 and F1@10 are higher than MVP baseline (even with 2 epoch training)
    - Comparison table printed showing deltas
  </done>
</task>

## Success Criteria

- [ ] `build_index.py --checkpoint` loads DualEncoder and extracts 512-d embeddings
- [ ] `outputs/index_trained/sar_embeddings.npy` is shape `(1167, 512)`
- [ ] Evaluation runs on trained index without error
- [ ] Cross-modal F1@5 and F1@10 improve vs MVP baseline
