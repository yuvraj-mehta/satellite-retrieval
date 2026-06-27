import React from 'react';
import { 
  Database, Layers, Maximize, Target, Activity, Map, Fingerprint, 
  Settings, Network, Search, Cpu, List, Link2, FileText, CheckCircle2, Save, Info,
  Box, Hexagon, Circle, GitMerge, ArrowRight
} from 'lucide-react';

export default function ArchitecturePage() {

  const Card = ({ children, className = "" }) => (
    <div className={`bg-[#121626]/80 border border-[#232B42] rounded-xl p-5 flex flex-col relative ${className}`}>
      {children}
    </div>
  );

  const Title = ({ children, className = "" }) => (
    <h3 className={`text-[12px] font-bold text-white mb-4 uppercase tracking-wider ${className}`}>
      {children}
    </h3>
  );

  return (
    <div className="flex flex-col gap-4 text-gray-100 h-full overflow-y-auto pr-2 pb-6 custom-scrollbar font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1.5">Model Architecture</h2>
          <p className="text-gray-400 text-[14px]">Dual-encoder framework for cross-modal satellite image retrieval</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0A1A14] border border-[#10B981]/30 text-[#10B981] px-4 py-2 rounded-lg text-[13px] font-medium">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
          Local Mode
        </div>
      </div>

      <div className="flex gap-4 shrink-0">
        
        {/* Left/Main Column */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Main Diagram */}
          <Card className="justify-center py-6">
            <div className="flex justify-between items-start w-full relative max-w-[1000px] mx-auto">
              
              {/* --- SAR BRANCH --- */}
              <div className="flex flex-col items-center w-[160px] relative z-10">
                <div className="text-[#8B5CF6] text-[12px] font-bold mb-1">SAR INPUT</div>
                <div className="text-gray-400 text-[11px] mb-0.5">Sentinel-1 SAR (GRD)</div>
                <div className="text-gray-500 text-[10px] mb-3">2 Channels: VV, VH</div>
                
                <div className="w-[120px] h-[120px] rounded-lg overflow-hidden border border-[#8B5CF6]/30 mb-4 bg-black">
                  <img src="http://localhost:8000/image?path=data/sen12ms-subset/ROIs2017_winter_s1/s1_21/ROIs2017_winter_s1_21_p30.tif&modality=sar" alt="SAR" className="w-full h-full object-contain" />
                </div>

                <div className="w-full bg-[#0B0E17] border border-[#232B42] rounded-lg p-3">
                  <div className="text-gray-400 text-[11px] mb-2 font-medium">Preprocessing</div>
                  <ul className="text-gray-500 text-[10px] space-y-1">
                    <li>• Radiometric Calib.</li>
                    <li>• Speckle Filtering</li>
                    <li>• Z-score Normalize</li>
                    <li>• Resize: 256×256</li>
                  </ul>
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="flex items-center h-[200px]">
                <div className="w-6 border-t-2 border-[#8B5CF6]/50 border-dashed relative">
                  <div className="absolute right-[-4px] top-[-5px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[#8B5CF6]/50"></div>
                </div>
              </div>

              <div className="flex flex-col items-center w-[140px] relative z-10">
                <div className="text-[#8B5CF6] text-[12px] font-bold mb-8">SAR ENCODER</div>
                
                <div className="w-full bg-[#0B0E17] border border-[#8B5CF6]/40 rounded-xl p-4 flex flex-col items-center relative shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                  <div className="text-white text-[12px] font-medium mb-1">ResNet50</div>
                  <div className="text-[#8B5CF6] text-[11px] mb-1">TorchGeo</div>
                  <div className="text-[#8B5CF6] text-[10px] mb-6 font-medium">S1 MoCo Weights</div>
                  
                  {/* Layer Stack Icon */}
                  <div className="relative w-16 h-16 flex flex-col items-center justify-center mb-2">
                    <div className="absolute w-12 h-12 bg-[#8B5CF6]/20 border-2 border-[#8B5CF6] rounded transform rotate-45 scale-y-50 -translate-y-4"></div>
                    <div className="absolute w-12 h-12 bg-[#8B5CF6]/30 border-2 border-[#8B5CF6] rounded transform rotate-45 scale-y-50"></div>
                    <div className="absolute w-12 h-12 bg-[#8B5CF6]/40 border-2 border-[#8B5CF6] rounded transform rotate-45 scale-y-50 translate-y-4"></div>
                  </div>
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="flex items-center h-[200px]">
                <div className="w-6 border-t-2 border-[#8B5CF6]/50 border-dashed relative">
                  <div className="absolute right-[-4px] top-[-5px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[#8B5CF6]/50"></div>
                </div>
              </div>

              <div className="flex flex-col items-center w-[100px] relative z-10">
                <div className="text-[#8B5CF6] text-[10px] font-bold mb-8 text-center uppercase tracking-wide">Projection Head</div>
                
                <div className="w-full bg-[#0B0E17] border border-[#8B5CF6]/30 rounded-xl p-3 flex flex-col items-center">
                  <div className="bg-[#121626] border border-[#232B42] w-full py-1.5 rounded text-center text-gray-300 text-[11px] mb-2">2048</div>
                  <div className="text-gray-500 mb-2">↓</div>
                  <div className="bg-[#121626] border border-[#232B42] w-full py-1.5 rounded text-center text-gray-300 text-[11px] mb-2">1024</div>
                  <div className="text-gray-500 mb-2">↓</div>
                  <div className="bg-[#121626] border border-[#8B5CF6]/50 w-full py-1.5 rounded text-center text-white font-medium text-[11px] mb-4 shadow-[0_0_10px_rgba(139,92,246,0.2)]">512</div>
                  
                  <div className="text-gray-400 text-[9px]">L2 Normalization</div>
                </div>
                <div className="text-[#8B5CF6]/70 text-[10px] mt-2">Encoder Output: 2048-d</div>
              </div>

              {/* --- SHARED EMBEDDING SPACE --- */}
              <div className="flex flex-col items-center w-[240px] relative z-10 -mt-2">
                <div className="text-[#3B82F6] text-[12px] font-bold mb-1">SHARED EMBEDDING SPACE</div>
                <div className="text-gray-300 text-[11px] mb-6">512-d L2 Normalized</div>
                
                {/* Node visualization */}
                <div className="w-full h-[180px] relative mb-4">
                  {/* Dashed circular border */}
                  <div className="absolute inset-2 border-2 border-dashed border-[#232B42] rounded-full"></div>
                  
                  {/* SVG Nodes and Lines */}
                  <svg width="100%" height="100%" viewBox="0 0 240 180" className="absolute inset-0">
                    {/* Connecting lines */}
                    <line x1="80" y1="50" x2="160" y2="40" stroke="#4B5563" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1="60" y1="90" x2="180" y2="85" stroke="#4B5563" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1="90" y1="120" x2="150" y2="130" stroke="#4B5563" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1="70" y1="140" x2="160" y2="110" stroke="#4B5563" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1="100" y1="70" x2="170" y2="60" stroke="#4B5563" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1="50" y1="110" x2="190" y2="120" stroke="#4B5563" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />

                    {/* SAR Nodes (Purple, Left) */}
                    <circle cx="80" cy="50" r="5" fill="#8B5CF6" />
                    <circle cx="60" cy="90" r="6" fill="#8B5CF6" />
                    <circle cx="90" cy="120" r="4" fill="#8B5CF6" />
                    <circle cx="70" cy="140" r="5" fill="#8B5CF6" />
                    <circle cx="100" cy="70" r="4" fill="#8B5CF6" />
                    <circle cx="50" cy="110" r="5" fill="#8B5CF6" />
                    <circle cx="45" cy="70" r="3" fill="#8B5CF6" opacity="0.6"/>
                    <circle cx="65" cy="40" r="3" fill="#8B5CF6" opacity="0.6"/>
                    <circle cx="95" cy="95" r="3" fill="#8B5CF6" opacity="0.6"/>
                    <circle cx="85" cy="145" r="3" fill="#8B5CF6" opacity="0.6"/>
                    <circle cx="55" cy="130" r="3" fill="#8B5CF6" opacity="0.6"/>
                    <circle cx="75" cy="75" r="3" fill="#8B5CF6" opacity="0.6"/>

                    {/* MS Nodes (Green, Right) */}
                    <circle cx="160" cy="40" r="5" fill="#10B981" />
                    <circle cx="180" cy="85" r="6" fill="#10B981" />
                    <circle cx="150" cy="130" r="4" fill="#10B981" />
                    <circle cx="160" cy="110" r="5" fill="#10B981" />
                    <circle cx="170" cy="60" r="4" fill="#10B981" />
                    <circle cx="190" cy="120" r="5" fill="#10B981" />
                    <circle cx="155" cy="65" r="3" fill="#10B981" opacity="0.6"/>
                    <circle cx="185" cy="55" r="3" fill="#10B981" opacity="0.6"/>
                    <circle cx="145" cy="95" r="3" fill="#10B981" opacity="0.6"/>
                    <circle cx="175" cy="140" r="3" fill="#10B981" opacity="0.6"/>
                    <circle cx="195" cy="90" r="3" fill="#10B981" opacity="0.6"/>
                    <circle cx="165" cy="150" r="3" fill="#10B981" opacity="0.6"/>
                  </svg>
                </div>

                {/* InfoNCE Loss Box below */}
                <div className="flex flex-col items-center mt-2">
                  <div className="flex gap-[60px] mb-2">
                    <div className="w-0.5 h-6 bg-[#8B5CF6]/50 relative">
                      <div className="absolute bottom-[-2px] left-[-3px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#8B5CF6]/50"></div>
                    </div>
                    <div className="w-0.5 h-6 bg-[#10B981]/50 relative">
                      <div className="absolute bottom-[-2px] left-[-3px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#10B981]/50"></div>
                    </div>
                  </div>
                  <div className="bg-[#121626] border border-[#3B82F6]/40 rounded-lg px-6 py-2 text-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <div className="text-[#3B82F6] font-bold text-[12px]">InfoNCE Loss</div>
                    <div className="text-gray-400 text-[10px]">Temperature (τ) = 0.07</div>
                  </div>
                </div>
              </div>


              {/* --- MS BRANCH --- */}
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

              {/* Arrow 3 (Reverse) */}
              <div className="flex items-center h-[200px]">
                <div className="w-6 border-t-2 border-[#10B981]/50 border-dashed relative">
                  <div className="absolute left-[-4px] top-[-5px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-[#10B981]/50"></div>
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

              {/* Arrow 4 (Reverse) */}
              <div className="flex items-center h-[200px]">
                <div className="w-6 border-t-2 border-[#10B981]/50 border-dashed relative">
                  <div className="absolute left-[-4px] top-[-5px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-[#10B981]/50"></div>
                </div>
              </div>

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

            </div>
          </Card>

          {/* Bottom 3 Cards Row */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* Training Pipeline */}
            <Card className="col-span-5">
              <Title className="text-[#3B82F6]">TRAINING PIPELINE (Offline)</Title>
              <div className="flex items-center justify-between mb-4 flex-1 pt-2">
                
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#3B82F6] bg-[#3B82F6]/10 p-2 rounded-lg border border-[#3B82F6]/20"><Database size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Paired<br/>Dataset</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Aligned SAR-MS<br/>Patches</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />
                
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-gray-300 bg-gray-800 p-2 rounded-lg border border-gray-700"><List size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Data<br/>Loader</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Batch Sampling<br/>+ Hard Negatives</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#3B82F6] bg-[#3B82F6]/10 p-2 rounded-lg border border-[#3B82F6]/20"><Link2 size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Dual<br/>Encoder</div>
                  <div className="text-[9px] text-gray-500 leading-tight">SAR Encoder<br/>+ MS Encoder</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#3B82F6] bg-[#3B82F6]/10 p-2 rounded-lg border border-[#3B82F6]/20"><FileText size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Projection<br/>Heads</div>
                  <div className="text-[9px] text-gray-500 leading-tight">2048 → 1024 → 512<br/>+ L2 Norm</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-gray-300 bg-gray-800 p-2 rounded-lg border border-gray-700"><Network size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">InfoNCE<br/>Loss</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Contrastive<br/>Alignment</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#8B5CF6] bg-[#8B5CF6]/10 p-2 rounded-lg border border-[#8B5CF6]/20"><Save size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Checkpoint</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Best Model<br/>Weights</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#10B981] bg-[#10B981]/10 p-2 rounded-lg border border-[#10B981]/20"><Database size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Build FAISS<br/>Index</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Gallery Embeddings<br/>IndexFlatIP</div>
                </div>
                
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-2 border-t border-[#232B42] pt-3">
                <Info size={14} className="text-[#3B82F6]" />
                Hard negative mining is used to improve embedding discriminability.
              </div>
            </Card>

            {/* Embedding Visualization */}
            <Card className="col-span-3">
              <Title className="text-[#3B82F6]">EMBEDDING SPACE VISUALIZATION (t-SNE)</Title>
              <div className="flex-1 flex flex-col items-center justify-center pt-2">
                <div className="w-full max-w-[200px] h-[80px] relative mb-4">
                  <svg width="100%" height="100%" viewBox="0 0 200 80">
                    <line x1="60" y1="40" x2="140" y2="40" stroke="#4B5563" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                    <line x1="70" y1="30" x2="130" y2="50" stroke="#4B5563" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                    <line x1="50" y1="50" x2="150" y2="30" stroke="#4B5563" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                    
                    {/* Purple cluster */}
                    <circle cx="50" cy="40" r="3" fill="#8B5CF6" />
                    <circle cx="45" cy="30" r="2" fill="#8B5CF6" />
                    <circle cx="55" cy="25" r="2.5" fill="#8B5CF6" />
                    <circle cx="65" cy="45" r="3.5" fill="#8B5CF6" />
                    <circle cx="40" cy="50" r="2" fill="#8B5CF6" />
                    <circle cx="60" cy="55" r="2.5" fill="#8B5CF6" />
                    <circle cx="35" cy="40" r="1.5" fill="#8B5CF6" />
                    <circle cx="50" cy="60" r="2" fill="#8B5CF6" />
                    <circle cx="70" cy="35" r="2" fill="#8B5CF6" />

                    {/* Green cluster */}
                    <circle cx="150" cy="40" r="3" fill="#10B981" />
                    <circle cx="155" cy="30" r="2" fill="#10B981" />
                    <circle cx="145" cy="25" r="2.5" fill="#10B981" />
                    <circle cx="135" cy="45" r="3.5" fill="#10B981" />
                    <circle cx="160" cy="50" r="2" fill="#10B981" />
                    <circle cx="140" cy="55" r="2.5" fill="#10B981" />
                    <circle cx="165" cy="40" r="1.5" fill="#10B981" />
                    <circle cx="150" cy="60" r="2" fill="#10B981" />
                    <circle cx="130" cy="35" r="2" fill="#10B981" />
                  </svg>
                </div>
                <div className="flex w-full justify-between px-4">
                  <div className="text-center">
                    <div className="text-[#8B5CF6] text-[11px] font-bold">SAR</div>
                    <div className="text-gray-500 text-[10px]">(Sentinel-1)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#10B981] text-[11px] font-bold">Multispectral</div>
                    <div className="text-gray-500 text-[10px]">(Sentinel-2)</div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 mt-4 border-t border-[#232B42] pt-3 text-center">
                Semantically similar regions are aligned across modalities.
              </div>
            </Card>

            {/* Inference Pipeline */}
            <Card className="col-span-4">
              <Title className="text-[#10B981]">INFERENCE PIPELINE (Online Retrieval)</Title>
              <div className="flex items-center justify-between mb-4 flex-1 pt-2">
                
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#8B5CF6] bg-[#8B5CF6]/10 p-2 rounded-lg border border-[#8B5CF6]/20"><Box size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Query<br/>Image</div>
                  <div className="text-[9px] text-gray-500 leading-tight">SAR or MS</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />
                
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-gray-300 bg-gray-800 p-2 rounded-lg border border-gray-700"><Settings size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Encoder</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Same Encoder<br/>as Training</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#3B82F6] bg-[#3B82F6]/10 p-2 rounded-lg border border-[#3B82F6]/20"><Hexagon size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">512-d<br/>Embedding</div>
                  <div className="text-[9px] text-gray-500 leading-tight">L2 Normalized</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#10B981] bg-[#10B981]/10 p-2 rounded-lg border border-[#10B981]/20"><FileText size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">FAISS<br/>Index</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Similarity Search<br/>(Top-K)</div>
                </div>
                <ArrowRight size={12} className="text-gray-600 mb-6" />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-[#10B981] bg-[#10B981]/10 p-2 rounded-lg border border-[#10B981]/20"><Search size={16} /></div>
                  <div className="text-[10px] font-bold text-white leading-tight">Top-K Results</div>
                  <div className="text-[9px] text-gray-500 leading-tight">Top-5 / Top-10<br/>Ranked Images</div>
                </div>
                
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-2 border-t border-[#232B42] pt-3">
                <Info size={14} className="text-[#10B981]" />
                Average retrieval latency: ~0.02-0.07 ms per query (FlatIP on M1 / Colab T4)
              </div>
            </Card>

          </div>

        </div>

        {/* Right Sidebar */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          
          <Card>
            <Title className="text-white">MODEL SUMMARY</Title>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 text-[12px]">
                <Box size={14} className="text-[#8B5CF6] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Architecture</div>
                  <div className="text-gray-200">Dual Encoder (CLIP-style)</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Cpu size={14} className="text-[#3B82F6] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Backbone</div>
                  <div className="text-gray-200">ResNet50 (Both Encoders)</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Settings size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Initialization</div>
                  <div className="text-gray-200">TorchGeo MoCo Weights<br/><span className="text-gray-500 text-[11px]">S1 (VV+VH), S2 (B4,B8,B11,B12)</span></div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Target size={14} className="text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Embedding Dimension</div>
                  <div className="text-gray-200">512 (L2 Normalized)</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Activity size={14} className="text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Loss Function</div>
                  <div className="text-gray-200">InfoNCE Contrastive Loss</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <GitMerge size={14} className="text-[#3B82F6] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Similarity Metric</div>
                  <div className="text-gray-200">Cosine Similarity (via FAISS IP)</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Database size={14} className="text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Index Type</div>
                  <div className="text-gray-200">FAISS IndexFlatIP</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Hexagon size={14} className="text-[#8B5CF6] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Optimizer</div>
                  <div className="text-gray-200">AdamW</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px]">
                <Circle size={14} className="text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-400 mb-0.5">Temperature (τ)</div>
                  <div className="text-gray-200">0.07</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <Title className="text-white">INPUT MODALITIES</Title>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[#8B5CF6] text-[13px] font-bold">
                  <Fingerprint size={16} /> Sentinel-1 SAR
                </div>
                <div className="text-[#8B5CF6] text-[10px] border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full">
                  2 Bands
                </div>
              </div>
              <div className="ml-6 flex flex-col gap-1 text-[12px] text-gray-300">
                <div className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-gray-500 before:rounded-full">VV Polarization</div>
                <div className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-gray-500 before:rounded-full">VH Polarization</div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#232B42]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[#10B981] text-[13px] font-bold">
                  <Maximize size={16} /> Sentinel-2 Multispectral
                </div>
                <div className="text-[#10B981] text-[10px] border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                  4 Bands
                </div>
              </div>
              <div className="ml-6 flex flex-col gap-1 text-[12px] text-gray-300">
                <div className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-gray-500 before:rounded-full">B4 (Red)</div>
                <div className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-gray-500 before:rounded-full">B8 (NIR)</div>
                <div className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-gray-500 before:rounded-full">B11 (SWIR-1)</div>
                <div className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-gray-500 before:rounded-full">B12 (SWIR-2)</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Title className="mb-0 text-white">EMBEDDING SPACE</Title>
              <Info size={12} className="text-gray-500" />
            </div>
            <div className="flex items-start gap-3">
              <div className="text-[#10B981] p-1.5 rounded bg-[#10B981]/10 border border-[#10B981]/20 mt-0.5">
                <Network size={16} />
              </div>
              <div>
                <div className="text-white text-[13px] font-bold mb-0.5">512-d</div>
                <div className="text-gray-400 text-[11px]">Shared across modalities</div>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Footer Info Notice */}
      <div className="bg-transparent border border-[#232B42] rounded-lg p-3 flex items-center justify-center gap-2 mt-2 shrink-0 text-[12px] text-gray-400">
        <Info size={14} className="text-[#3B82F6]" />
        This architecture implements a cross-modal retrieval system that learns a common representation space for Sentinel-1 SAR and Sentinel-2 Multispectral imagery.
      </div>
      
    </div>
  );
}
