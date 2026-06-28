import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const getNavLinkClass = ({ isActive }) => 
    `px-5 text-[13px] transition-colors border-b-2 h-full flex items-center tracking-wide font-medium ${
      isActive 
        ? 'text-white border-accent-violet-light' 
        : 'text-text-secondary border-transparent hover:text-white'
    }`;

  return (
    <aside className="fixed inset-x-0 top-0 h-navbar-height bg-[#06080F]/90 backdrop-blur-xl border-b border-white/5 flex items-center z-[100] px-6">
      
      {/* Logo Area */}
      <div className="flex items-center gap-3 pr-10 border-r border-white/5 h-full">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--accent-violet-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="var(--accent-violet-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="var(--accent-violet-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="text-lg font-bold text-white tracking-wide">Project Vasundhra</div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-row flex-1 h-full items-center pl-4 gap-2">
        <NavLink to="/" end className={getNavLinkClass}>Dashboard</NavLink>
        <NavLink to="/search" className={getNavLinkClass}>Search / Query</NavLink>
        <NavLink to="/analytics" className={getNavLinkClass}>Analytics</NavLink>
        <NavLink to="/dataset" className={getNavLinkClass}>Dataset</NavLink>
        <NavLink to="/architecture" className={getNavLinkClass}>Model Architecture</NavLink>

        <NavLink to="/about" className={getNavLinkClass}>About</NavLink>
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-6 h-full border-l border-white/5 pl-6">
        
        {/* Icons */}
        <div className="flex items-center gap-4 text-text-secondary">
          <button className="hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
          <button className="hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-cyan text-[#06080F] flex items-center justify-center text-[11px] font-extrabold tracking-wider">
            TI
          </div>
          <div className="flex flex-col">
            <div className="text-[13px] text-white font-medium leading-none flex items-center gap-2">
              Team ISRO
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div className="text-[10px] text-text-muted mt-1 leading-none">Bharatiya Antariksh...</div>
          </div>
        </div>

      </div>
    </aside>
  );
}
