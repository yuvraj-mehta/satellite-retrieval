import React, { useState } from 'react';
import { 
  Layers, Satellite, Calendar, Link2, Maximize, 
  ChevronDown, Check, Folder, FileText, 
  ArrowRight, Info, Download, ArrowLeftRight, 
  Map, SlidersHorizontal, Box, Network, Crop, Target, LayoutGrid, Database
} from 'lucide-react';

export default function DatasetPage() {
  const [data] = useState({
    total_pairs: "1,167", scenes: 2, image_size: "256 × 256", resolution: "10 m / pixel",
    paired_percent: 100, season: "Winter 2017", sar_images: "1,167", optical_images: "1,167"
  });

  const Card = ({ children, className = "" }) => (
    <div className={`bg-[#121626]/80 border border-[#232B42] rounded-xl p-5 flex flex-col ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 text-gray-100 h-full overflow-y-auto pr-2 pb-6 custom-scrollbar font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1.5">Dataset</h2>
          <p className="text-gray-400 text-[13px]">Overview of the dataset used for training and retrieval.</p>
        </div>
        <button className="flex items-center gap-2 bg-transparent hover:bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/50 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors">
          <Download size={16} /> Download Dataset Info
        </button>
      </div>

      {/* Middle Row (3 cols) */}
      <div className="grid grid-cols-12 gap-5 shrink-0">
        
        {/* Sample Paired Patch */}
        <Card className="col-span-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
              Sample Paired Patch <Info size={14} className="text-gray-500 cursor-pointer" />
            </h3>
          </div>
          
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                Scene
                <div className="bg-[#0B0E17] border border-[#232B42] px-3 py-1.5 rounded flex items-center gap-2 text-gray-200 cursor-pointer hover:border-gray-500 transition-colors">
                  21 <ChevronDown size={14} className="text-gray-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                Patch ID
                <div className="bg-[#0B0E17] border border-[#232B42] px-3 py-1.5 rounded flex items-center gap-2 text-gray-200 cursor-pointer hover:border-gray-500 transition-colors">
                  30 <ChevronDown size={14} className="text-gray-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded border border-[#10B981]/20 font-medium">
              <Check size={14} /> Pair Verified
            </div>
          </div>

          <div className="flex gap-4 items-center mb-5">
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-[#8B5CF6]">Sentinel-1 SAR (VV + VH)</div>
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#0B0E17] border border-[#232B42] relative">
                 <img src="http://localhost:8000/image?path=data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p30.tif&modality=sar" alt="SAR Patch" className="w-full h-full object-contain" />
              </div>
            </div>
            
            <div className="bg-[#121626] p-2.5 rounded-full border border-[#232B42] text-[#8B5CF6] shrink-0 mt-6 cursor-pointer hover:bg-[#232B42] transition-colors">
              <ArrowLeftRight size={16} />
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div className="text-[12px] font-semibold text-[#10B981]">Sentinel-2 Multispectral (B4, B8, B11)</div>
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#0B0E17] border border-[#232B42] relative">
                 <img src="http://localhost:8000/image?path=data/sen12ms-subset/ROIs2017_winter_s2/s2_21/ROIs2017_winter_s2_21_p30.tif&modality=optical" alt="Optical Patch" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 text-[11px] text-gray-400 pt-4 border-t border-[#232B42]">
            <div>
              <div className="mb-1">Scene ID</div>
              <div className="text-gray-100 font-medium">21</div>
            </div>
            <div>
              <div className="mb-1">Patch ID</div>
              <div className="text-gray-100 font-medium">30</div>
            </div>
            <div>
              <div className="mb-1">SAR File</div>
              <div className="text-gray-100 font-medium truncate">s1_21_p30.tif</div>
            </div>
            <div>
              <div className="mb-1">Optical File</div>
              <div className="text-gray-100 font-medium truncate">s2_21_p30.tif</div>
            </div>
            <div>
              <div className="mb-1">Dimensions</div>
              <div className="text-gray-100 font-medium">256 × 256</div>
            </div>
            <div>
              <div className="mb-1">Resolution</div>
              <div className="text-gray-100 font-medium">10 m / pixel</div>
            </div>
          </div>
        </Card>

        {/* Dataset Composition */}
        <Card className="col-span-4">
          <h3 className="text-[14px] font-semibold text-white mb-4">Dataset Composition</h3>
          <div className="font-mono text-[12px] leading-loose overflow-y-auto pr-2 custom-scrollbar flex-1">
            <div className="flex items-center gap-2 text-gray-200 mb-1">
              <Folder size={14} className="text-[#8B5CF6] fill-[#8B5CF6]/20" /> SEN12MS
            </div>
            
            <div className="ml-2.5 pl-3 border-l border-[#232B42]">
              <div className="flex items-center gap-2 text-gray-200 mb-1">
                <ChevronDown size={14} className="text-gray-500 -ml-2" />
                <Folder size={14} className="text-[#8B5CF6] fill-[#8B5CF6]/20" /> 
                ROIs2017_winter <span className="text-[#8B5CF6] text-[11px] ml-1 font-sans">(Currently Used)</span>
              </div>
              
              <div className="ml-4 pl-3 border-l border-[#232B42]">
                <div className="flex items-center gap-2 text-gray-300 mb-1">
                  <ChevronDown size={14} className="text-gray-500 -ml-2" />
                  <Folder size={14} className="text-gray-400 fill-gray-400/20" /> Scene 21
                </div>
                <div className="ml-4 flex items-center gap-2 text-gray-400">
                  <FileText size={14} /> s1_21_p000.tif <span className="text-[#8B5CF6] ml-1 font-sans">(SAR)</span>
                </div>
                <div className="ml-4 flex items-center gap-2 text-gray-400 mb-1">
                  <FileText size={14} /> s2_21_p000.tif <span className="text-[#10B981] ml-1 font-sans">(Optical)</span>
                </div>
                <div className="ml-4 text-gray-500 mb-2">...</div>
                
                <div className="flex items-center gap-2 text-gray-300 mb-1">
                  <ChevronDown size={14} className="text-gray-500 -ml-2" />
                  <Folder size={14} className="text-gray-400 fill-gray-400/20" /> Scene 22
                </div>
                <div className="ml-4 flex items-center gap-2 text-gray-400">
                  <FileText size={14} /> s1_22_p000.tif <span className="text-[#8B5CF6] ml-1 font-sans">(SAR)</span>
                </div>
                <div className="ml-4 flex items-center gap-2 text-gray-400 mb-1">
                  <FileText size={14} /> s2_22_p000.tif <span className="text-[#10B981] ml-1 font-sans">(Optical)</span>
                </div>
                <div className="ml-4 text-gray-500 mb-2">...</div>
              </div>
            </div>

            <div className="ml-2.5 pl-3 border-l border-[#232B42] text-gray-500">
              <div className="flex items-center gap-2 mb-1">
                <Folder size={14} /> ROIs2017_spring
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Folder size={14} /> ROIs2017_summer
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Folder size={14} /> ROIs2017_fall
              </div>
            </div>
          </div>
        </Card>

        {/* Dataset Statistics */}
        <Card className="col-span-3">
          <h3 className="text-[14px] font-semibold text-white mb-6">Dataset Statistics</h3>
          <div className="flex flex-col gap-5 text-[13px] justify-center flex-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-3">
                <div className="text-[#8B5CF6]">
                  <Database size={18} />
                </div>
                Total SAR Images
              </span>
              <span className="text-white text-[15px] font-medium">{data.sar_images}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-3">
                <div className="text-[#10B981]">
                  <LayoutGrid size={18} />
                </div>
                Total Multispectral Images
              </span>
              <span className="text-white text-[15px] font-medium">{data.optical_images}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-3">
                <div className="text-[#3B82F6]">
                  <Link2 size={18} />
                </div>
                Paired Samples
              </span>
              <span className="text-white text-[15px] font-medium">{data.total_pairs}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-3">
                <div className="text-[#F59E0B]">
                  <Map size={18} />
                </div>
                Unique Scenes
              </span>
              <span className="text-white text-[15px] font-medium">{data.scenes}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-3">
                <div className="text-[#8B5CF6]">
                  <Crop size={18} />
                </div>
                Patch Size
              </span>
              <span className="text-white text-[15px] font-medium">{data.image_size}</span>
            </div>
          </div>
        </Card>

      </div>

      {/* Bottom Row (2 cols) */}
      <div className="grid grid-cols-12 gap-5 shrink-0">
        
        {/* Band Information */}
        <Card className="col-span-4">
          <h3 className="text-[14px] font-semibold text-white mb-4">Band Information</h3>
          
          <div className="mb-6">
            <h4 className="text-[12px] font-medium text-[#8B5CF6] mb-3">Sentinel-1 SAR (2 Bands)</h4>
            <div className="flex gap-2">
              <span className="border border-[#8B5CF6] text-[#8B5CF6] text-[11px] px-3 py-1 rounded font-medium">VV</span>
              <span className="border border-[#8B5CF6] text-[#8B5CF6] text-[11px] px-3 py-1 rounded font-medium">VH</span>
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-medium text-[#10B981] mb-3">Sentinel-2 Multispectral (13 Bands Available)</h4>
            
            <div className="flex items-center gap-3 mb-4 text-[12px] text-gray-400">
              Using in Model:
              <div className="flex gap-2">
                <span className="border border-[#10B981] text-[#10B981] text-[11px] px-2.5 py-1 rounded font-medium">B4</span>
                <span className="border border-[#10B981] text-[#10B981] text-[11px] px-2.5 py-1 rounded font-medium">B8</span>
                <span className="border border-[#10B981] text-[#10B981] text-[11px] px-2.5 py-1 rounded font-medium">B11</span>
              </div>
            </div>

            <div className="text-[12px] text-gray-400 flex flex-wrap items-center gap-2">
              Available but not used (9):
              <div className="flex flex-wrap gap-2 mt-1 w-full">
                {['B1', 'B2', 'B3', 'B5', 'B6', 'B7', 'B8A'].map(b => (
                  <span key={b} className="border border-gray-600 text-gray-400 text-[11px] px-2.5 py-1 rounded font-medium">{b}</span>
                ))}
                <span className="border border-gray-600 text-gray-400 text-[11px] px-2.5 py-1 rounded font-medium">+1 more</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Preprocessing Pipeline */}
        <Card className="col-span-8">
          <h3 className="text-[14px] font-semibold text-white mb-4">Preprocessing Pipeline</h3>
          
          <div className="flex justify-between items-center flex-1 px-4">
            
            <div className="flex flex-col items-center gap-3 text-center w-24">
              <div className="text-[#8B5CF6] p-4 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/10"><FileText size={22} /></div>
              <div>
                <div className="text-[12px] font-bold text-white mb-1">1. Read</div>
                <div className="text-[11px] text-gray-400 leading-snug">GeoTIFF<br/>files</div>
              </div>
            </div>
            
            <ArrowRight size={16} className="text-gray-500 mb-8" />
            
            <div className="flex flex-col items-center gap-3 text-center w-24">
              <div className="text-[#8B5CF6] p-4 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/10"><Layers size={22} /></div>
              <div>
                <div className="text-[12px] font-bold text-white mb-1">2. Align</div>
                <div className="text-[11px] text-gray-400 leading-snug">Co-location<br/>alignment</div>
              </div>
            </div>
            
            <ArrowRight size={16} className="text-gray-500 mb-8" />

            <div className="flex flex-col items-center gap-3 text-center w-24">
              <div className="text-[#3B82F6] p-4 rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/10"><SlidersHorizontal size={22} /></div>
              <div>
                <div className="text-[12px] font-bold text-white mb-1">3. Normalize</div>
                <div className="text-[11px] text-gray-400 leading-snug">Z-score<br/>(per band)</div>
              </div>
            </div>
            
            <ArrowRight size={16} className="text-gray-500 mb-8" />

            <div className="flex flex-col items-center gap-3 text-center w-24">
              <div className="text-[#10B981] p-4 rounded-xl border border-[#10B981]/20 bg-[#10B981]/10"><Crop size={22} /></div>
              <div>
                <div className="text-[12px] font-bold text-white mb-1">4. Augment</div>
                <div className="text-[11px] text-gray-400 leading-snug">Flip, rotate,<br/>crop</div>
              </div>
            </div>
            
            <ArrowRight size={16} className="text-gray-500 mb-8" />

            <div className="flex flex-col items-center gap-3 text-center w-24">
              <div className="text-[#10B981] p-4 rounded-xl border border-[#10B981]/20 bg-[#10B981]/10"><Box size={22} /></div>
              <div>
                <div className="text-[12px] font-bold text-white mb-1">5. Tensor</div>
                <div className="text-[11px] text-gray-400 leading-snug">PyTorch<br/>tensor</div>
              </div>
            </div>
            
            <ArrowRight size={16} className="text-gray-500 mb-8" />

            <div className="flex flex-col items-center gap-3 text-center w-24">
              <div className="text-[#10B981] p-4 rounded-xl border border-[#10B981]/20 bg-[#10B981]/10"><Network size={22} /></div>
              <div>
                <div className="text-[12px] font-bold text-white mb-1">6. Model Input</div>
                <div className="text-[11px] text-gray-400 leading-snug">Encoder<br/>(512-d embed)</div>
              </div>
            </div>
            
          </div>
        </Card>

      </div>

      {/* Dataset Summary (Full width card) */}
      <Card className="shrink-0 p-4">
        <h3 className="text-[14px] font-semibold text-white mb-4 ml-2">Dataset Summary</h3>
        <div className="grid grid-cols-6 items-center">
          
          <div className="flex items-center gap-4 border-r border-[#232B42] px-4">
            <div className="text-[#8B5CF6] shrink-0">
              <Database size={24} />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Source</div>
              <div className="text-[14px] font-medium text-white">SEN12MS</div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-r border-[#232B42] px-4">
            <div className="text-[#F59E0B] shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Season</div>
              <div className="text-[14px] font-medium text-white">Winter 2017</div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-r border-[#232B42] px-4">
            <div className="text-[#3B82F6] shrink-0">
              <Map size={24} />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Scenes</div>
              <div className="text-[14px] font-medium text-white">21, 22</div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-r border-[#232B42] px-4">
            <div className="text-[#10B981] shrink-0">
              <Satellite size={24} />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Sensors</div>
              <div className="text-[13px] font-medium text-white leading-tight">Sentinel-1 (SAR) +<br/>Sentinel-2 (Multispectral)</div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-r border-[#232B42] px-4">
            <div className="text-[#8B5CF6] shrink-0">
              <Target size={24} />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Resolution</div>
              <div className="text-[14px] font-medium text-white">10 m / pixel</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4">
            <div className="text-[#3B82F6] shrink-0">
              <Link2 size={24} />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 mb-1">Total Paired Samples</div>
              <div className="text-[14px] font-medium text-white">{data.total_pairs}</div>
            </div>
          </div>

        </div>
      </Card>

      {/* Info notice bar */}
      <div className="bg-transparent border border-[#232B42] rounded-lg p-3 flex items-center justify-center gap-2 mt-2 shrink-0 text-[12px] text-gray-400">
        <Info size={14} className="text-[#3B82F6]" />
        This is a prototype subset of SEN12MS (Winter 2017). The system is designed to scale to the full dataset and additional seasons.
      </div>
      
    </div>
  );
}
