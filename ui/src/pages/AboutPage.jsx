import React from 'react';
import { 
  Calendar, Target, Rocket, Users, Globe, Zap, Code, 
  CircleDot, User, Mail, Search, LineChart,
  Eye, Leaf, Map, Cpu, Box
} from 'lucide-react';

export default function AboutPage() {

  const Card = ({ children, className = "" }) => (
    <div className={`bg-[#121626]/80 border border-[#232B42] rounded-xl p-5 flex flex-col relative ${className}`}>
      {children}
    </div>
  );

  const Title = ({ children, className = "" }) => (
    <h3 className={`text-[13px] font-bold text-white mb-4 ${className}`}>
      {children}
    </h3>
  );

  return (
    <div className="flex flex-col gap-5 text-gray-100 h-full overflow-y-auto pr-2 pb-6 custom-scrollbar font-sans">
      
      {/* Top Row: Hero & At a Glance */}
      <div className="grid grid-cols-12 gap-5 shrink-0">
        
        {/* Hero Card */}
        <div className="col-span-8 bg-[#121626]/80 border border-[#232B42] rounded-xl overflow-hidden relative shadow-lg">
          {/* Earth Background Image - Using a placeholder space/earth image */}
          <div className="absolute inset-0 right-0 left-1/3 opacity-40 mix-blend-screen pointer-events-none" 
               style={{ 
                 backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop')", 
                 backgroundSize: "cover", 
                 backgroundPosition: "center right",
                 maskImage: "linear-gradient(to right, transparent, black 40%)"
               }}
          ></div>
          
          <div className="relative z-10 p-6 flex flex-col h-full justify-between">
            <div>
              <div className="text-[#8B5CF6] text-[12px] font-bold tracking-wider mb-3">About</div>
              <h1 className="text-4xl font-bold text-white mb-3">
                Project <span className="text-[#8B5CF6]">Vasundhara</span>
              </h1>
              <div className="text-[#10B981] text-[14px] font-semibold mb-4">
                AI for Earth. Insights for Tomorrow.
              </div>
              <p className="text-gray-300 text-[13px] leading-relaxed max-w-xl mb-8">
                We are a team of 4 passionate builders and researchers developing a cross-modal 
                satellite image retrieval system that can find semantically similar places across 
                SAR and multispectral imagery. Our goal is to make Earth observation search 
                faster, smarter, and more accessible.
              </p>
            </div>
            
            <div className="flex items-center gap-8 text-[12px] pt-4 border-t border-[#232B42]/50 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="bg-[#8B5CF6]/10 p-2 rounded-lg border border-[#8B5CF6]/20 text-[#8B5CF6]">
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="text-gray-400 text-[11px] mb-0.5">Team Founded</div>
                  <div className="text-white font-medium">May 2025</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#10B981]/10 p-2 rounded-lg border border-[#10B981]/20 text-[#10B981]">
                  <Target size={18} />
                </div>
                <div>
                  <div className="text-gray-400 text-[11px] mb-0.5">Focus Area</div>
                  <div className="text-white font-medium">Earth Observation AI</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#3B82F6]/10 p-2 rounded-lg border border-[#3B82F6]/20 text-[#3B82F6]">
                  <Rocket size={18} />
                </div>
                <div>
                  <div className="text-gray-400 text-[11px] mb-0.5">Hackathon</div>
                  <div className="text-white font-medium">Bharatiya Antariksh Hackathon</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* At a Glance */}
        <Card className="col-span-4">
          <Title>At a Glance</Title>
          <div className="flex flex-col gap-4 text-[12px] flex-1 justify-center">
            <div className="flex justify-between items-center border-b border-[#232B42] pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Users size={16} className="text-[#8B5CF6]" /> Team Name
              </div>
              <div className="text-white font-medium">Project Vasundhara</div>
            </div>
            <div className="flex justify-between items-center border-b border-[#232B42] pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Users size={16} className="text-[#10B981]" /> Team Size
              </div>
              <div className="text-white font-medium">4 Members</div>
            </div>
            <div className="flex justify-between items-center border-b border-[#232B42] pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Globe size={16} className="text-[#3B82F6]" /> Project Domain
              </div>
              <div className="text-white font-medium">Remote Sensing & AI</div>
            </div>
            <div className="flex justify-between items-center border-b border-[#232B42] pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Zap size={16} className="text-[#F59E0B]" /> Approach
              </div>
              <div className="text-white font-medium">Cross-Modal Retrieval</div>
            </div>
            <div className="flex justify-between items-center border-b border-[#232B42] pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Code size={16} className="text-[#10B981]" /> Tech Stack
              </div>
              <div className="text-white font-medium">PyTorch, FAISS, FastAPI</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-400">
                <CircleDot size={16} className="text-[#8B5CF6]" /> Current Phase
              </div>
              <div className="text-white font-medium">Prototype Development</div>
            </div>
          </div>
        </Card>

      </div>

      {/* Middle Row: Our Team & Key Contributions */}
      <div className="grid grid-cols-12 gap-5 shrink-0">
        
        {/* Our Team */}
        <div className="col-span-12 flex flex-col">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-white mb-1">Our Team</h3>
            <p className="text-gray-400 text-[12px]">A diverse team united by curiosity and purpose.</p>
          </div>
          
          <div className="grid grid-cols-4 gap-4 flex-1">
            
            {/* Team Member 1 */}
            <Card className="p-4 flex flex-col h-full bg-[#121626] border-[#232B42]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#8B5CF6] flex items-center justify-center font-bold text-lg shrink-0">
                  YM
                </div>
                <div>
                  <div className="text-white font-bold text-[13px] mb-0.5">Yuvraj Mehta</div>
                  <div className="text-[#8B5CF6] text-[10px] leading-tight">Team Lead & ML Engineer<br/>Lead</div>
                </div>
              </div>
              <div className="text-gray-400 text-[11px] leading-relaxed mb-4 flex-1">
                Leads model development and system architecture. Focused on representation learning and efficient retrieval systems.
              </div>
              <div className="flex gap-3 text-gray-400 mt-auto">
                <div className="bg-[#8B5CF6]/10 p-1.5 rounded text-[#8B5CF6] cursor-pointer hover:bg-[#8B5CF6]/20 transition-colors"><Code size={14} /></div>
                <div className="bg-[#8B5CF6]/10 p-1.5 rounded text-[#8B5CF6] cursor-pointer hover:bg-[#8B5CF6]/20 transition-colors"><User size={14} /></div>
                <div className="bg-[#8B5CF6]/10 p-1.5 rounded text-[#8B5CF6] cursor-pointer hover:bg-[#8B5CF6]/20 transition-colors"><Mail size={14} /></div>
              </div>
            </Card>

            {/* Team Member 2 */}
            <Card className="p-4 flex flex-col h-full bg-[#121626] border-[#232B42]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] flex items-center justify-center font-bold text-lg shrink-0">
                  PK
                </div>
                <div>
                  <div className="text-white font-bold text-[13px] mb-0.5">Priya Kumari</div>
                  <div className="text-[#10B981] text-[10px] leading-tight">Data Scientist</div>
                </div>
              </div>
              <div className="text-gray-400 text-[11px] leading-relaxed mb-4 flex-1">
                Handles data pipelines, preprocessing and exploratory analysis to ensure high-quality, aligned satellite pairs.
              </div>
              <div className="flex gap-3 text-gray-400 mt-auto">
                <div className="bg-[#10B981]/10 p-1.5 rounded text-[#10B981] cursor-pointer hover:bg-[#10B981]/20 transition-colors"><Code size={14} /></div>
                <div className="bg-[#10B981]/10 p-1.5 rounded text-[#10B981] cursor-pointer hover:bg-[#10B981]/20 transition-colors"><User size={14} /></div>
                <div className="bg-[#10B981]/10 p-1.5 rounded text-[#10B981] cursor-pointer hover:bg-[#10B981]/20 transition-colors"><Mail size={14} /></div>
              </div>
            </Card>

            {/* Team Member 3 */}
            <Card className="p-4 flex flex-col h-full bg-[#121626] border-[#232B42]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center font-bold text-lg shrink-0">
                  SK
                </div>
                <div>
                  <div className="text-white font-bold text-[13px] mb-0.5">Sumit Kumar</div>
                  <div className="text-[#3B82F6] text-[10px] leading-tight">Backend Developer</div>
                </div>
              </div>
              <div className="text-gray-400 text-[11px] leading-relaxed mb-4 flex-1">
                Builds APIs and retrieval services, optimizes FAISS indexing and ensures low-latency performance.
              </div>
              <div className="flex gap-3 text-gray-400 mt-auto">
                <div className="bg-[#3B82F6]/10 p-1.5 rounded text-[#3B82F6] cursor-pointer hover:bg-[#3B82F6]/20 transition-colors"><Code size={14} /></div>
                <div className="bg-[#3B82F6]/10 p-1.5 rounded text-[#3B82F6] cursor-pointer hover:bg-[#3B82F6]/20 transition-colors"><User size={14} /></div>
                <div className="bg-[#3B82F6]/10 p-1.5 rounded text-[#3B82F6] cursor-pointer hover:bg-[#3B82F6]/20 transition-colors"><Mail size={14} /></div>
              </div>
            </Card>

            {/* Team Member 4 */}
            <Card className="p-4 flex flex-col h-full bg-[#121626] border-[#232B42]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center font-bold text-lg shrink-0">
                  AK
                </div>
                <div>
                  <div className="text-white font-bold text-[13px] mb-0.5">Akshat Kumar</div>
                  <div className="text-[#F59E0B] text-[10px] leading-tight">Frontend Developer</div>
                </div>
              </div>
              <div className="text-gray-400 text-[11px] leading-relaxed mb-4 flex-1">
                Designs intuitive interfaces and visualizations to make satellite search simple and insightful.
              </div>
              <div className="flex gap-3 text-gray-400 mt-auto">
                <div className="bg-[#F59E0B]/10 p-1.5 rounded text-[#F59E0B] cursor-pointer hover:bg-[#F59E0B]/20 transition-colors"><Code size={14} /></div>
                <div className="bg-[#F59E0B]/10 p-1.5 rounded text-[#F59E0B] cursor-pointer hover:bg-[#F59E0B]/20 transition-colors"><User size={14} /></div>
                <div className="bg-[#F59E0B]/10 p-1.5 rounded text-[#F59E0B] cursor-pointer hover:bg-[#F59E0B]/20 transition-colors"><Mail size={14} /></div>
              </div>
            </Card>

          </div>
        </div>


      </div>

      {/* Connect With Us */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#121626]/80 border border-[#232B42] rounded-xl p-5 shrink-0 mt-4">
        <div className="font-bold text-white text-[14px]">Connect With Us</div>
        <div className="flex flex-wrap gap-8 text-[12px] text-gray-300">
          <div className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
            <div className="text-gray-400 bg-[#0B0E17] border border-[#232B42] p-1.5 rounded"><Code size={14} /></div>
            github.com/project-vasundhara
          </div>
          <div className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
            <div className="text-gray-400 bg-[#0B0E17] border border-[#232B42] p-1.5 rounded"><User size={14} /></div>
            linkedin.com/company/project-vasundhara
          </div>
          <div className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
            <div className="text-gray-400 bg-[#0B0E17] border border-[#232B42] p-1.5 rounded"><Mail size={14} /></div>
            projectvasundhara.team@gmail.com
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="mt-4 bg-[#0A1A14] border border-[#10B981]/20 rounded-xl p-5 flex items-center gap-4 relative overflow-hidden shrink-0">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30"
             style={{ 
               backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 100%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0,50 Q25,20 50,50 T100,50 T150,50 T200,50%22 fill=%22none%22 stroke=%22%2310B981%22 stroke-width=%222%22/%3E%3Cpath d=%22M0,60 Q25,30 50,60 T100,60 T150,60 T200,60%22 fill=%22none%22 stroke=%22%2310B981%22 stroke-width=%221%22 opacity=%220.5%22/%3E%3Cpath d=%22M0,40 Q25,10 50,40 T100,40 T150,40 T200,40%22 fill=%22none%22 stroke=%22%2310B981%22 stroke-width=%221%22 opacity=%220.3%22/%3E%3C/svg%3E')",
               backgroundSize: "cover",
               backgroundRepeat: "no-repeat"
             }}
        ></div>
        
        <div className="text-[#10B981] p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 relative z-10">
          <Leaf size={24} />
        </div>
        <div className="relative z-10">
          <div className="text-[#10B981] font-bold text-[14px] mb-1">
            Vasundhara (वसुंधरा) — Our Earth. Our Responsibility.
          </div>
          <div className="text-gray-400 text-[12px]">
            We build technology that respects the planet and helps us understand it better.
          </div>
        </div>
      </div>

    </div>
  );
}
