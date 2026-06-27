import re

with open("ui/src/pages/ArchitecturePage.jsx", "r") as f:
    content = f.read()

# 1. Main layout flex
content = content.replace(
    '<div className="flex gap-4 shrink-0">',
    '<div className="flex flex-col xl:flex-row gap-4 shrink-0">'
)
content = content.replace(
    '<div className="w-80 shrink-0 flex flex-col gap-4">',
    '<div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">'
)

# 2. Main Diagram container
content = content.replace(
    '<Card className="justify-center py-6 overflow-x-auto custom-scrollbar">\n            <div className="flex justify-between items-start w-full relative min-w-[1100px] max-w-[1200px] mx-auto">',
    '<Card className="justify-center py-6">\n            <div className="flex flex-col items-center gap-8 w-full relative max-w-[900px] mx-auto">'
)

# 3. SAR Branch wrapping
content = content.replace(
    '{/* --- SAR BRANCH --- */}\n              <div className="flex flex-col items-center w-[160px] relative z-10">',
    '{/* --- SAR BRANCH --- */}\n              <div className="flex flex-wrap justify-center items-center gap-4 w-full">\n                <div className="flex flex-col items-center w-[160px] relative z-10">'
)

# 4. Remove the h-[200px] wrapper from Arrow 1 and Arrow 2
content = content.replace(
    '<div className="flex items-center h-[200px]">',
    '<div className="flex items-center shrink-0">'
)

# 5. We need to close the SAR BRANCH div and open the SHARED EMBEDDING div properly.
# Find the end of SAR PROJECTION HEAD
sar_end = content.find('Encoder Output: 2048-d</div>\n              </div>') + len('Encoder Output: 2048-d</div>\n              </div>')
content = content[:sar_end] + '\n              </div>\n' + content[sar_end:]

# 6. Change SHARED EMBEDDING SPACE wrapper
# from `<div className="flex flex-col items-center w-[240px] relative z-10 -mt-2">`
shared_embed = """              {/* --- SHARED EMBEDDING SPACE --- */}
              <div className="flex flex-col items-center w-[240px] relative z-10 -mt-2">
                {/* Arrow down from SAR */}
                <div className="h-8 border-l-2 border-[#8B5CF6]/50 border-dashed relative mb-2">
                  <div className="absolute bottom-[-4px] left-[-5px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#8B5CF6]/50"></div>
                </div>
                <div className="text-[#3B82F6] text-[12px] font-bold mb-1">SHARED EMBEDDING SPACE</div>"""
content = content.replace(
    '              {/* --- SHARED EMBEDDING SPACE --- */}\n              <div className="flex flex-col items-center w-[240px] relative z-10 -mt-2">\n                <div className="text-[#3B82F6] text-[12px] font-bold mb-1">SHARED EMBEDDING SPACE</div>',
    shared_embed
)

# 7. Add arrow up from MS, after InfoNCE Loss Box
info_nce_end = content.find('Temperature (τ) = 0.07</div>\n                  </div>\n                </div>\n              </div>') + len('Temperature (τ) = 0.07</div>\n                  </div>\n                </div>\n              </div>')
ms_arrow_up = """
                {/* Arrow up from MS */}
                <div className="h-8 border-l-2 border-[#10B981]/50 border-dashed relative mt-2">
                  <div className="absolute top-[-4px] left-[-5px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-[#10B981]/50"></div>
                </div>
"""
content = content[:info_nce_end-14] + ms_arrow_up + content[info_nce_end-14:]


# 8. Reorder MS Branch to be Left to Right!
# Current order: MS Proj Head -> Arrow3 (Reverse) -> MS Encoder -> Arrow4 (Reverse) -> MS Input
# New order: MS Input -> Arrow (Forward) -> MS Encoder -> Arrow (Forward) -> MS Proj Head
ms_input_start = content.find('{/* Arrow 4 (Reverse) */}') 
# Wait, parsing this manually is tricky. Let's just regex replace the entire MS Branch.
ms_branch_start = content.find('{/* --- MS BRANCH --- */}')
bottom_cards_start = content.find('</div>\n          </Card>\n\n          {/* Bottom Cards Row */}')
ms_branch_old = content[ms_branch_start:bottom_cards_start]

ms_branch_new = """{/* --- MS BRANCH --- */}
              <div className="flex flex-wrap justify-center items-center gap-4 w-full">
                
                <div className="flex flex-col items-center w-[160px] relative z-10">
                  <div className="text-[#10B981] text-[12px] font-bold mb-1">MS INPUT</div>
                  <div className="text-gray-400 text-[11px] mb-0.5">Sentinel-2 Multispectral</div>
                  <div className="text-gray-500 text-[10px] mb-3">4 Bands: B4, B8, B11, B12</div>
                  
                  <div className="w-[120px] h-[120px] rounded-lg overflow-hidden border border-[#10B981]/30 mb-4 bg-black">
                    <img src="http://localhost:8000/image?path=data/sen12ms-subset/ROIs2017_winter_s2/s2_21/ROIs2017_winter_s2_21_p30.tif&modality=optical" alt="Optical" className="w-full h-full object-contain" />
                  </div>

                  <div className="w-full bg-[#0B0E17] border border-[#232B42] rounded-lg p-3">
                    <div className="text-gray-400 text-[11px] mb-2 font-medium">Preprocessing</div>
                    <ul className="text-gray-500 text-[10px] space-y-1">
                      <li>• Cloud Masking</li>
                      <li>• Z-score Normalize</li>
                      <li>• Resize: 256×256</li>
                    </ul>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center shrink-0">
                  <div className="w-6 border-t-2 border-[#10B981]/50 border-dashed relative">
                    <div className="absolute right-[-4px] top-[-5px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[#10B981]/50"></div>
                  </div>
                </div>

                <div className="flex flex-col items-center w-[140px] relative z-10">
                  <div className="text-[#10B981] text-[12px] font-bold mb-8">MS ENCODER</div>
                  
                  <div className="w-full bg-[#0B0E17] border border-[#10B981]/40 rounded-xl p-4 flex flex-col items-center relative shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="text-white text-[12px] font-medium mb-1">ResNet50</div>
                    <div className="text-[#10B981] text-[11px] mb-1">TorchGeo</div>
                    <div className="text-[#10B981] text-[10px] mb-6 font-medium">S2 MoCo Weights</div>
                    
                    {/* Layer Stack Icon */}
                    <div className="relative w-16 h-16 flex flex-col items-center justify-center mb-2">
                      <div className="absolute w-12 h-12 bg-[#10B981]/20 border-2 border-[#10B981] rounded transform rotate-45 scale-y-50 -translate-y-4"></div>
                      <div className="absolute w-12 h-12 bg-[#10B981]/30 border-2 border-[#10B981] rounded transform rotate-45 scale-y-50"></div>
                      <div className="absolute w-12 h-12 bg-[#10B981]/40 border-2 border-[#10B981] rounded transform rotate-45 scale-y-50 translate-y-4"></div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center shrink-0">
                  <div className="w-6 border-t-2 border-[#10B981]/50 border-dashed relative">
                    <div className="absolute right-[-4px] top-[-5px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[#10B981]/50"></div>
                  </div>
                </div>

                <div className="flex flex-col items-center w-[100px] relative z-10">
                  <div className="text-[#10B981] text-[10px] font-bold mb-8 text-center uppercase tracking-wide">Projection Head</div>
                  
                  <div className="w-full bg-[#0B0E17] border border-[#10B981]/30 rounded-xl p-3 flex flex-col items-center">
                    <div className="bg-[#121626] border border-[#232B42] w-full py-1.5 rounded text-center text-gray-300 text-[11px] mb-2">2048</div>
                    <div className="text-gray-500 mb-2">↓</div>
                    <div className="bg-[#121626] border border-[#232B42] w-full py-1.5 rounded text-center text-gray-300 text-[11px] mb-2">1024</div>
                    <div className="text-gray-500 mb-2">↓</div>
                    <div className="bg-[#121626] border border-[#10B981]/50 w-full py-1.5 rounded text-center text-white font-medium text-[11px] mb-4 shadow-[0_0_10px_rgba(16,185,129,0.2)]">512</div>
                    
                    <div className="text-gray-400 text-[9px]">L2 Normalization</div>
                  </div>
                  <div className="text-[#10B981]/70 text-[10px] mt-2">Encoder Output: 2048-d</div>
                </div>

              </div>
"""
content = content.replace(ms_branch_old, ms_branch_new)


# 9. Bottom Cards Row container
content = content.replace(
    '<div className="flex gap-4 items-stretch overflow-x-auto custom-scrollbar pb-2">',
    '<div className="flex flex-col xl:flex-row gap-4 items-stretch pb-2">'
)
content = content.replace(
    '<div className="flex-1 flex flex-col gap-4 min-w-[800px]">',
    '<div className="flex-1 flex flex-col gap-4">'
)
# Inside pipelines, change `justify-between` to `justify-center gap-x-2 gap-y-6 flex-wrap`
content = content.replace(
    '<div className="flex items-center justify-between mb-4 flex-1 pt-2 px-4">',
    '<div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-6 mb-4 flex-1 pt-2 px-4">'
)
content = content.replace(
    '<div className="flex items-center justify-between mb-4 flex-1 pt-2 px-12">',
    '<div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-6 mb-4 flex-1 pt-2 px-4">'
)
content = content.replace(
    '<div className="w-[340px] shrink-0 flex">',
    '<div className="w-full xl:w-[340px] shrink-0 flex">'
)
content = content.replace(
    '<ArrowRight size={16} className="text-gray-600 mb-8" />',
    '<ArrowRight size={16} className="text-gray-600 mb-6 shrink-0" />'
)

with open("ui/src/pages/ArchitecturePage.jsx", "w") as f:
    f.write(content)
