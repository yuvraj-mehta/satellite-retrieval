# Google Colab Training Guide

This guide provides instructions to train the satellite retrieval model on Google Colab using a free GPU (T4/A100), downloading the dataset directly from Kaggle.

---

## Step 1: Package Code Locally
Package the codebase (excluding local data, checkpoints, and caches) into a single `.zip` file.

Run the following command in your local terminal from the repository root (`/Users/yuvrajmehta/Developer/satellite-retrieval`):

```bash
zip -r codebase.zip backend/ \
  -x "backend/data/*" \
  -x "backend/outputs/checkpoints/*" \
  -x "backend/outputs/*.png" \
  -x "backend/__pycache__/*" \
  -x "backend/*/__pycache__/*" \
  -x "backend/*/*/__pycache__/*"
```

---

## Step 2: Upload Codebase to Google Drive
1. Open [Google Drive](https://drive.google.com/).
2. Create a folder named `satellite-retrieval`.
3. Upload `codebase.zip` into this folder.
*(Note: You do not need to upload `kaggle.json` to Google Drive; we will upload it directly inside the Colab notebook.)*

---

## Step 3: Run Google Colab Notebook
Create a new notebook on [Google Colab](https://colab.research.google.com/), select a **GPU T4** (or better) runtime, and run the following cells:

### Cell 1: Mount Google Drive
```python
from google.colab import drive
drive.mount('/content/drive')
```

### Cell 2: Setup Kaggle Credentials
Run this Python cell to configure your credentials. It validates the format of any existing key and will automatically prompt for a fresh upload if the key is missing, invalid, or corrupted:

```python
from google.colab import files
import os
import json

def check_valid_kaggle_json(filepath):
    if not os.path.exists(filepath):
        return False
    try:
        with open(filepath, 'r') as f:
            creds = json.load(f)
        return 'username' in creds and 'key' in creds
    except Exception:
        return False

target_path = '/root/.kaggle/kaggle.json'

if not check_valid_kaggle_json(target_path):
    # If the file exists but is invalid, clean it up to allow re-uploading
    if os.path.exists(target_path):
        print("Existing kaggle.json is invalid or corrupted. Deleting it to trigger re-upload...")
        os.remove(target_path)
        
    print("Please upload your kaggle.json file (downloaded from Kaggle Settings > API > Create New Token):")
    uploaded = files.upload()
    
    filename = list(uploaded.keys())[0]
    if filename != 'kaggle.json':
        raise ValueError(
            f"Expected 'kaggle.json' but received '{filename}'.\n\n"
            "HOW TO GET THE CORRECT FILE:\n"
            "1. Go to https://www.kaggle.com/ and log in.\n"
            "2. Click your Profile picture (top-right) -> Settings.\n"
            "3. Scroll down to the 'API' section and click 'Create New Token'.\n"
            "4. This downloads 'kaggle.json' (~100 bytes) to your computer. Upload THAT file here."
        )
        
    try:
        creds = json.loads(uploaded['kaggle.json'].decode('utf-8'))
        if 'username' not in creds or 'key' not in creds:
            raise ValueError()
    except Exception:
        raise ValueError("Invalid kaggle.json format. The file must contain your Kaggle 'username' and 'key'.")
        
    os.makedirs('/root/.kaggle', exist_ok=True)
    with open(target_path, 'wb') as f:
        f.write(uploaded['kaggle.json'])
    os.chmod(target_path, 0o600)
    print("Kaggle credentials configured successfully!")
else:
    print("Valid Kaggle credentials already configured.")
```

### Cell 3: Extract Codebase and Download Dataset
Extract the codebase zip file, and download the `sen12ms-subset` dataset directly from Kaggle. The `-o` flag is passed to `unzip` to force overwriting existing files without interactive prompts:

```bash
%%bash
# 1. Create target directory and extract codebase (overwrite if exists)
mkdir -p /content/project
unzip -o -q /content/drive/MyDrive/satellite-retrieval/codebase.zip -d /content/project

# 2. Download dataset from Kaggle (2.4 GB — takes ~1 minute)
kaggle datasets download -d bhaveshbhardwaj7/sen12ms-subset

# 3. Extract dataset directly into backend/data/ (overwrite if exists)
mkdir -p /content/project/backend/data
unzip -o -q sen12ms-subset.zip -d /content/project/backend/data/

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
