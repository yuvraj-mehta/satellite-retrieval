# Google Cloud TPU v5e-1 Training Guide

This guide details how to configure and run the dual-encoder training on a single-chip **Google Cloud TPU v5e (v5litepod-1)** VM using PyTorch XLA (`torch_xla`), downloading the dataset directly from Kaggle.

---

## 1. Provision the Cloud TPU VM
A `v5e-1` instance provides a single TPU v5e Tensor Core with 16 GB HBM2 memory, which runs PyTorch XLA in single-device mode.

Create the TPU VM using the `gcloud` CLI (substitute your GCP zone and project settings):

```bash
gcloud compute tpus tpu-vm create satellite-tpu \
  --zone=us-east5-c \
  --accelerator-type=v5litepod-1 \
  --version=tpu-vm-pt-2.3-v5e
```
*Note: The `--version=tpu-vm-pt-2.3-v5e` flag installs a TPU-optimized image with PyTorch and `torch_xla` pre-installed.*

---

## 2. SSH into the TPU VM
Once provisioning completes, SSH directly into the instance:

```bash
gcloud compute tpus tpu-vm ssh satellite-tpu --zone=us-east5-c
```

---

## 3. Transfer Code and Kaggle Token
We will use a Google Cloud Storage (GCS) bucket to transfer your codebase and Kaggle API token to the TPU VM.

### On Your Local Machine:
1. Create a GCS bucket (if you don't have one):
   ```bash
   gcloud storage buckets create gs://satellite-retrieval-bucket --location=us-east5
   ```
2. Upload the codebase and Kaggle token (downloaded from Kaggle Settings > Create New Token):
   ```bash
   gcloud storage cp codebase.zip gs://satellite-retrieval-bucket/
   gcloud storage cp kaggle.json gs://satellite-retrieval-bucket/
   ```

### On the Cloud TPU VM:
1. Download the files from GCS:
   ```bash
   gcloud storage cp gs://satellite-retrieval-bucket/codebase.zip .
   gcloud storage cp gs://satellite-retrieval-bucket/kaggle.json .
   ```
2. Extract the codebase:
   ```bash
   mkdir -p project
   unzip -q codebase.zip -d project
   ```
3. Set up Kaggle credentials:
   ```bash
   mkdir -p ~/.kaggle
   mv kaggle.json ~/.kaggle/
   chmod 600 ~/.kaggle/kaggle.json
   ```

---

## 4. Install Dependencies and Download Dataset
Activate the environment, install python libraries, and download the dataset directly from Kaggle to the TPU VM:

```bash
# 1. Install pip libraries
pip install rasterio timm torchgeo kaggle

# 2. Download the dataset from Kaggle
kaggle datasets download -d bhaveshbhardwaj7/sen12ms-subset

# 3. Extract directly to the codebase project data directory
mkdir -p project/backend/data
unzip -q sen12ms-subset.zip -d project/backend/data/

# 4. Verify extraction
ls -l project/backend/data/sen12ms-subset
```

---

## 5. Launch TPU Training
Set the `PJRT_DEVICE` environment variable to instruct PyTorch XLA to target the TPU, and run the training script. 

Because TPUs handle large memory bandwidth very efficiently, we can use a batch size of `32` or even `64`:

```bash
cd project

# Set PyTorch XLA PJRT Runtime device
export PJRT_DEVICE=TPU

PYTHONPATH=backend python backend/train.py \
  --hard-neg-mining \
  --epochs 50 \
  --batch-size 32 \
  --accum-steps 2 \
  --data backend/data/sen12ms-subset \
  --lc-labels backend/outputs/index/lc_labels.json \
  --output-dir checkpoints-tpu
```

---

## 6. Retrieve the Checkpoint
After training completes, upload the final checkpoint to your GCS bucket from the TPU VM:

```bash
gcloud storage cp checkpoints-tpu/best_model.pt gs://satellite-retrieval-bucket/checkpoints/
```

Then download it locally to place it at `backend/outputs/checkpoints/best_model.pt` and rebuild your retrieval index!
