import json
import pickle
import re
from pathlib import Path

# IGBP class name mapping
IGBP_CLASSES = {
    "1": "Evergreen Needleleaf Forest",
    "2": "Evergreen Broadleaf Forest",
    "3": "Deciduous Needleleaf Forest",
    "4": "Deciduous Broadleaf Forest",
    "5": "Mixed Forest",
    "6": "Closed Shrublands",
    "7": "Open Shrublands",
    "8": "Woody Savannas",
    "9": "Savannas",
    "10": "Grasslands",
    "11": "Permanent Wetlands",
    "12": "Croplands",
    "13": "Urban and Built-up",
    "14": "Cropland/Natural Vegetation Mosaic",
    "15": "Snow and Ice",
    "16": "Barren or Sparsely Vegetated",
    "17": "Water Bodies"
}

def main():
    backend_dir = Path(__file__).parent.parent
    pickle_path = backend_dir / "SEN12MS-master" / "labels" / "single_label_IGBPfull_ClsNum.pkl"
    output_path = backend_dir / "outputs" / "index" / "lc_labels.json"
    
    print(f"Loading labels from {pickle_path}...")
    with open(pickle_path, "rb") as f:
        pkl_data = pickle.load(f)
        
    labels = {}
    class_counts = {str(i): 0 for i in range(1, 18)}
    subset_scenes = {"21", "22"}
    
    # regex to parse: ROIs2017_winter_s2_{scene_id}_p{patch_id}.tif
    pattern = re.compile(r"ROIs2017_winter_s2_(\d+)_p(\d+)\.tif")
    
    for key, lc_class in pkl_data.items():
        match = pattern.match(key)
        if match:
            scene_id = match.group(1)
            patch_id = match.group(2)
            lbl_key = f"{scene_id}_{patch_id}"
            # Store in output labels
            labels[lbl_key] = int(lc_class)
            
            # Count only for scene 21 and 22
            if scene_id in subset_scenes:
                class_counts[str(lc_class)] += 1
                
    total_patches = len(labels)
    subset_total = sum(class_counts.values())
    
    output_data = {
        "labels": labels,
        "class_counts": class_counts,
        "igbp_class_names": IGBP_CLASSES,
        "total_patches": total_patches
    }
    
    print(f"Saving JSON index to {output_path}...")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)
        
    print("\n" + "="*50)
    print(" LAND COVER DISTRIBUTION SUMMARY (SCENES 21 & 22)")
    print("="*50)
    print(f"{'Class ID':<10} | {'Class Name':<35} | {'Count':<6}")
    print("-" * 57)
    for cid in sorted(class_counts.keys(), key=int):
        cnt = class_counts[cid]
        if cnt > 0:
            cname = IGBP_CLASSES.get(cid, "Unknown")
            print(f"{cid:<10} | {cname:<35} | {cnt:<6}")
    print("-" * 57)
    print(f"{'Total':<10} | {'':<35} | {subset_total:<6}")
    print("="*50)
    print(f"Successfully processed {total_patches} winter patches (subset size: {subset_total} patches).")

if __name__ == "__main__":
    main()
