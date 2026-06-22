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
    # Pass duplicate OpenMP runtime ignore env var
    import os
    env = os.environ.copy()
    env["KMP_DUPLICATE_LIB_OK"] = "TRUE"

    result = subprocess.run(
        [sys.executable, "evaluation/evaluate.py", "--index-dir", index_dir, "--k", "5", "10"],
        capture_output=True, text=True, env=env
    )
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
    # Load saved results
    with open(f"{index_dir}/evaluation_results.json") as f:
        return json.load(f)


def main():
    baseline_dir = Path("outputs/index")
    trained_dir = Path("outputs/index_trained")

    if not (baseline_dir / "evaluation_results.json").exists():
        print(f"Error: Baseline evaluation results not found in '{baseline_dir}'. Running evaluation now...")
        run_evaluation(str(baseline_dir))

    print("=" * 70)
    print("BASELINE (MVP ResNet50):")
    print("=" * 70)
    with open(baseline_dir / "evaluation_results.json") as f:
        baseline = json.load(f)

    if not (trained_dir / "evaluation_results.json").exists():
        print(f"Error: Trained evaluation results not found in '{trained_dir}'.")
        print("Please train the model, extract embeddings, and run evaluation first:")
        print("1. python train.py --epochs 20")
        print("2. python scripts/build_index.py --checkpoint outputs/checkpoints/best_model.pt")
        print("3. python evaluation/evaluate.py --index-dir outputs/index_trained")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("TRAINED (DualEncoder + InfoNCE):")
    print("=" * 70)
    with open(trained_dir / "evaluation_results.json") as f:
        trained = json.load(f)

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
