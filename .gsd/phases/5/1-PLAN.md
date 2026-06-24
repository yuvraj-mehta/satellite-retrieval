---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Demo Script, README & Submission Polish

## Objective

Create a clean end-to-end demo script, write the README with setup/training/evaluation instructions, and do a final timing benchmark to confirm < 100ms retrieval time. This is what judges will use to evaluate the submission.

## Context

- Everything from Phases 1–4 must be complete
- `outputs/checkpoints/best_model.pt` — trained model
- `outputs/index_trained/` — trained model FAISS index

## Tasks

<task type="auto">
  <name>Create scripts/demo.py — end-to-end query demo</name>
  <files>scripts/demo.py</files>
  <action>
    Create `scripts/demo.py`:

    ```python
    """
    End-to-end retrieval demo.

    Given a query image path, loads the trained model, retrieves Top-5 results,
    and displays them side by side with similarity scores.

    Usage:
        python scripts/demo.py --query data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif
        python scripts/demo.py --query-modality optical --target-modality sar
    """
    import sys
    import argparse
    import time
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    import numpy as np
    import torch
    import rasterio
    import matplotlib.pyplot as plt
    import matplotlib.gridspec as gridspec

    from models.dual_encoder import DualEncoder
    from models.encoder import ResNet50Encoder, get_device
    from retrieval.faiss_utils import FAISSRetriever


    def load_tif(path, bands=None, normalize=True, modality="sar"):
        with rasterio.open(path) as src:
            if bands:
                data = src.read([b + 1 for b in bands])
            else:
                data = src.read()

        data = data.astype(np.float32)
        if normalize:
            if modality == "sar":
                data = np.clip(data, -25.0, 0.0)
                data = (data + 25.0) / 25.0
            else:
                data = np.clip(data / 10000.0, 0.0, 1.0)
        return data


    def encode_image(img_arr, modality, model, device):
        """Encode a single image array to a normalized embedding."""
        tensor = torch.tensor(img_arr, dtype=torch.float32).unsqueeze(0).to(device)
        with torch.no_grad():
            if isinstance(model, DualEncoder):
                if modality == "sar":
                    emb = model.encode_sar(tensor)
                else:
                    emb = model.encode_optical(tensor)
            else:
                emb = model(tensor)
        return emb.cpu().float().numpy()


    def main():
        parser = argparse.ArgumentParser()
        parser.add_argument("--query", required=True, help="Path to query .tif file")
        parser.add_argument("--query-modality", default="sar", choices=["sar", "optical"])
        parser.add_argument("--target-modality", default="optical", choices=["sar", "optical"])
        parser.add_argument("--k", type=int, default=5)
        parser.add_argument("--checkpoint", default="outputs/checkpoints/best_model.pt")
        parser.add_argument("--index-dir", default="outputs/index_trained")
        parser.add_argument("--save", action="store_true")
        args = parser.parse_args()

        device = get_device()
        print(f"Device: {device}")

        # Load model
        if Path(args.checkpoint).exists():
            ckpt = torch.load(args.checkpoint, map_location=device)
            emb_dim = ckpt.get("args", {}).get("embedding_dim", 512)
            model = DualEncoder(embedding_dim=emb_dim, pretrained=False).to(device)
            model.load_state_dict(ckpt["model_state_dict"])
            model.eval()
            print(f"Loaded trained DualEncoder (dim={emb_dim})")
        else:
            in_ch = 2 if args.query_modality == "sar" else 3
            model = ResNet50Encoder(in_channels=in_ch, pretrained=True).to(device)
            model.eval()
            print("Using pretrained ResNet50 baseline")

        # Load FAISS index
        idx_dir = Path(args.index_dir)
        retriever = FAISSRetriever.load(
            str(idx_dir / "combined.index"),
            str(idx_dir / "combined.meta")
        )

        # Load and encode query
        bands = None if args.query_modality == "sar" else [3, 2, 1]
        query_arr = load_tif(args.query, bands=bands, modality=args.query_modality)
        
        t0 = time.time()
        query_emb = encode_image(query_arr, args.query_modality, model, device)
        results = retriever.search(query_emb, k=args.k + 10)  # get extra to filter by modality
        elapsed_ms = (time.time() - t0) * 1000

        # Filter to target modality
        target_results = [r for r in results[0] if r["modality"] == args.target_modality][:args.k]
        print(f"\nQuery: {args.query}")
        print(f"Query modality: {args.query_modality} -> Target: {args.target_modality}")
        print(f"Retrieval time: {elapsed_ms:.2f}ms")
        print(f"\nTop-{args.k} results:")
        for r in target_results:
            print(f"  Rank {r['rank']}: Scene {r['scene_id']}, Patch {r['patch_id']}, Score: {r['score']:.4f}")

        # Visualize
        fig, axes = plt.subplots(1, args.k + 1, figsize=(4 * (args.k + 1), 4))
        query_display = query_arr[0] if args.query_modality == "sar" else np.transpose(query_arr, (1, 2, 0))
        cmap = "gray" if args.query_modality == "sar" else None
        axes[0].imshow(query_display, cmap=cmap, vmin=0, vmax=1)
        axes[0].set_title(f"Query\n({args.query_modality})", fontweight="bold")
        axes[0].axis("off")

        for i, r in enumerate(target_results):
            r_bands = None if r["modality"] == "sar" else [3, 2, 1]
            r_arr = load_tif(r["path"], bands=r_bands, modality=r["modality"])
            r_display = r_arr[0] if r["modality"] == "sar" else np.transpose(r_arr, (1, 2, 0))
            r_cmap = "gray" if r["modality"] == "sar" else None
            axes[i + 1].imshow(np.clip(r_display, 0, 1), cmap=r_cmap)
            axes[i + 1].set_title(f"Rank {i+1}\nScore: {r['score']:.3f}")
            axes[i + 1].axis("off")

        plt.suptitle(f"{args.query_modality.upper()} → {args.target_modality.upper()} Retrieval | {elapsed_ms:.1f}ms", fontsize=12)
        plt.tight_layout()

        if args.save:
            out_path = Path("outputs") / "demo_result.png"
            out_path.parent.mkdir(exist_ok=True)
            plt.savefig(out_path, dpi=150, bbox_inches="tight")
            print(f"Saved: {out_path}")
        else:
            plt.show()

    if __name__ == "__main__":
        main()
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    source venv/bin/activate
    python scripts/demo.py \
        --query "data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif" \
        --query-modality sar --target-modality optical \
        --k 5 --save
    ls -la outputs/demo_result.png
    # Check retrieval time is < 100ms
  </verify>
  <done>
    - Demo runs without error
    - Prints Top-5 results with scores
    - Retrieval time < 100ms
    - `outputs/demo_result.png` saved
  </done>
</task>

<task type="auto">
  <name>Create README.md with setup, training, and evaluation instructions</name>
  <files>README.md</files>
  <action>
    Create `README.md`:

    ```markdown
    # Cross-Modal Satellite Image Retrieval

    **ISRO/Bharatiya Antariksh Hackathon** — Cross-Modal Satellite Image Retrieval Using Multi-Sensor Remote Sensing Data

    ## Overview

    A retrieval system that finds semantically similar satellite images across sensor modalities:
    - SAR → Optical (cross-modal)
    - Optical → SAR (cross-modal)  
    - SAR → SAR (same-modal)
    - Optical → Optical (same-modal)

    **Architecture**: Dual ResNet50 encoders with InfoNCE contrastive learning in a shared 512-d embedding space. FAISS IndexFlatIP for efficient similarity search.

    ## Setup

    ```bash
    python3.11 -m venv venv
    source venv/bin/activate
    pip install torch==2.12.1 torchvision==0.27.1 faiss-cpu==1.14.3 rasterio==1.4.4 \
                numpy==1.26.4 matplotlib pillow tqdm scikit-learn
    ```

    ## Dataset

    Download SEN12MS subset from Kaggle and place at `data/sen12ms-subset/`.

    Expected structure:
    ```
    data/sen12ms-subset/
      ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p{patch}.tif  (SAR)
      ROIs2017_winter_s2/s2_21/ROIs2017_winter_s2_21_p{patch}.tif  (Optical)
    ```

    Verify the dataset:
    ```bash
    python scripts/verify_dataset.py
    ```

    ## Quick Start (MVP Baseline — No Training)

    ```bash
    # 1. Build FAISS index using pretrained ResNet50
    python scripts/build_index.py --batch-size 16

    # 2. Evaluate all 4 retrieval modes
    python evaluation/evaluate.py --index-dir outputs/index

    # 3. Demo query
    python scripts/demo.py \
        --query "data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p100.tif" \
        --query-modality sar --target-modality optical --k 5 --save
    ```

    ## Training (Contrastive Dual Encoder)

    ```bash
    # M1 Mac (small batch + gradient accumulation)
    python train.py --epochs 20 --batch-size 8 --accum-steps 4

    # HP Victus / GPU machine
    python train.py --epochs 50 --batch-size 32 --accum-steps 2

    # Build index with trained model
    python scripts/build_index.py \
        --checkpoint outputs/checkpoints/best_model.pt \
        --output-dir outputs/index_trained --batch-size 16

    # Evaluate trained model
    python evaluation/evaluate.py --index-dir outputs/index_trained
    ```

    ## Evaluation Metrics

    | Mode | F1@5 | F1@10 | Time/query |
    |------|------|-------|------------|
    | SAR → SAR | - | - | - |
    | OPT → OPT | - | - | - |
    | SAR → OPT | - | - | - |
    | OPT → SAR | - | - | - |

    *(Fill in after running evaluation)*

    ## Project Structure

    ```
    satellite-retrieval/
    ├── datasets/sen12ms_dataset.py    # Dataset loader
    ├── models/
    │   ├── encoder.py                 # ResNet50 feature extractor
    │   └── dual_encoder.py            # Contrastive dual encoder
    ├── retrieval/faiss_utils.py       # FAISS index wrapper
    ├── evaluation/
    │   ├── metrics.py                 # F1@K, P@K, R@K
    │   └── evaluate.py                # Full evaluation pipeline
    ├── scripts/
    │   ├── verify_dataset.py          # Dataset health check
    │   ├── visualize_samples.py       # SAR/optical visualization
    │   ├── build_index.py             # Embedding extraction + index build
    │   ├── demo.py                    # End-to-end retrieval demo
    │   └── compare_results.py         # Baseline vs. trained comparison
    ├── train.py                       # Training entry point
    └── data/sen12ms-subset/           # Dataset (not tracked in git)
    ```
    ```
  </action>
  <verify>
    cd /Users/yuvrajmehta/Developer/satellite-retrieval
    # Check README renders correctly (just view first 10 lines)
    head -20 README.md
    # Confirm all referenced scripts exist
    ls scripts/verify_dataset.py scripts/visualize_samples.py scripts/build_index.py scripts/demo.py
    ls evaluation/evaluate.py evaluation/metrics.py models/encoder.py models/dual_encoder.py
    ls datasets/sen12ms_dataset.py retrieval/faiss_utils.py train.py
  </verify>
  <done>
    - `README.md` created with full instructions
    - All referenced files exist in their expected locations
    - README accurately describes the project structure
  </done>
</task>

## Success Criteria

- [ ] `scripts/demo.py` runs end-to-end with retrieval time < 100ms
- [ ] `outputs/demo_result.png` saved correctly
- [ ] `README.md` created and all referenced files exist
- [ ] All scripts runnable from project root
