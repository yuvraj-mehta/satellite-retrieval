import rasterio

s1_path = "data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p302.tif"
s2_path = "data/sen12ms-subset/ROIs2017_winter_s2/s2_21/ROIs2017_winter_s2_21_p302.tif"

with rasterio.open(s1_path) as src:
    print("\nS1")
    print("Bands:", src.count)
    print("Height:", src.height)
    print("Width:", src.width)

with rasterio.open(s2_path) as src:
    print("\nS2")
    print("Bands:", src.count)
    print("Height:", src.height)
    print("Width:", src.width)