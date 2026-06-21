from datasets.sen12ms_dataset import SEN12MSDataset

dataset = SEN12MSDataset(
    "data/sen12ms-subset"
)

print("Total Samples:", len(dataset))

sample = dataset[0]

print()
print("SAR Shape:", sample["sar"].shape)
print("Optical Shape:", sample["optical"].shape)

print()
print(sample["sar_path"])
print(sample["optical_path"])