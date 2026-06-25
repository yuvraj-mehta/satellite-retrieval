# Google Colab Training Guide

This guide provides instructions to train the satellite retrieval model on Google Colab using a free GPU (T4/A100), downloading the dataset directly from Kaggle.

---

## Step 1: Package Code Locally
Package the codebase (excluding local data, checkpoints, and caches) into a single `.zip` file.

Run the following command in your local terminal from the repository root (`/Users/yuvrajmehta/Developer/satellite-retrieval`):

```bash
zip -r codebase.zip backend/ \
  -x "backend/data/*" \
  -x "backend/outputs/*" \
  -x "backend/__pycache__/*" \
  -x "backend/*/__pycache__/*" \
  -x "backend/*/*/__pycache__/*"
```

---

## Step 2: Upload Files to Google Drive
1. Go to [Kaggle](https://www.kaggle.com/), log in, navigate to **Settings** under your profile, and click **Create New Token**. This downloads a file named `kaggle.json`.
2. Open [Google Drive](https://drive.google.com/).
3. Create a folder named `satellite-retrieval`.
4. Upload `codebase.zip` and your `kaggle.json` file into this folder.

---

## Step 3: Run Google Colab Notebook
Create a new notebook on [Google Colab](https://colab.research.google.com/), select a **GPU T4** (or better) runtime, and run the following cells:

### Cell 1: Mount Google Drive
```python
from google.colab import drive
drive.mount('/content/drive')
```

### Cell 2: Setup Kaggle Credentials
Copy `kaggle.json` from Google Drive to the local home directory and configure permissions:

```bash
%%bash
mkdir -p ~/.kaggle
cp /content/drive/MyDrive/satellite-retrieval/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json
```

### Cell 3: Extract Codebase and Download Dataset
Extract the codebase zip file, and download the `sen12ms-subset` dataset directly from Kaggle:

```bash
%%bash
# 1. Create target directory and extract codebase
mkdir -p /content/project
unzip -q /content/drive/MyDrive/satellite-retrieval/codebase.zip -d /content/project

# 2. Download dataset from Kaggle (2.4 GB — takes ~1 minute)
kaggle datasets download -d bhaveshbhardwaj7/sen12ms-subset

# 3. Extract dataset directly into backend/data/
mkdir -p /content/project/backend/data
unzip -q sen12ms-subset.zip -d /content/project/backend/data/

# 4. Verify directory structure
ls -l /content/project/backend/data/sen12ms-subset
```

### Cell 4: Install Required Dependencies
Install the remote-sensing packages inside the Colab environment.

```bash
%%bash
pip install rasterio timm torchgeo
```

### Cell 5: Create Persistent Checkpoint Directory in Drive
```python
import os
os.makedirs('/content/drive/MyDrive/satellite-retrieval/checkpoints', exist_ok=True)
```

### Cell 6: Run the Training Script on GPU
Execute the contrastive training loop. The checkpoints will be saved directly back to Google Drive.

```bash
%%bash
cd /content/project

PYTHONPATH=backend python backend/train.py \
  --hard-neg-mining \
  --epochs 50 \
  --batch-size 32 \
  --accum-steps 2 \
  --data backend/data/sen12ms-subset \
  --lc-labels backend/outputs/index/lc_labels.json \
  --output-dir /content/drive/MyDrive/satellite-retrieval/checkpoints
```

---

## Step 4: Retrieve Checkpoint and Evaluate Locally
Once training is complete:

1. Download `best_model.pt` from your Google Drive folder (`satellite-retrieval/checkpoints/best_model.pt`).
2. Move it to your local project directory at `backend/outputs/checkpoints/best_model.pt`.
3. Build the trained index locally:
   ```bash
   PYTHONPATH=backend ./venv/bin/python backend/scripts/build_index.py \
     --checkpoint backend/outputs/checkpoints/best_model.pt \
     --data backend/data/sen12ms-subset
   ```
4. Compare the performance against the baseline:
   ```bash
   cd backend
   ../venv/bin/python scripts/compare_results.py
   ```
