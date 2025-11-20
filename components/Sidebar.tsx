
import React, { useState } from 'react';
import { AppMode } from '../types';
import { ImagePlus, Wand2, ScanEye, ChevronLeft, ChevronRight, Hexagon } from 'lucide-react';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navItems = [
    { mode: AppMode.GENERATE, label: 'Generate', icon: ImagePlus, desc: 'Text to Image' },
    { mode: AppMode.EDIT, label: 'Edit', icon: Wand2, desc: 'Modify Image' },
    { mode: AppMode.ANALYZE, label: 'Analyze', icon: ScanEye, desc: 'Image to Text' },
  ];

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-full bg-gray-900/95 border-r border-gray-800 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out z-50
        ${isCollapsed ? 'w-20' : 'w-64 shadow-2xl'}
      `}
      aria-label="Main Navigation"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 z-50 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-full p-1 shadow-lg transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Section */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} h-20 mb-2`} role="banner">
        <div className="relative group cursor-default" aria-hidden="true">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-8 h-8 bg-gray-900 ring-1 ring-white/10 rounded-lg flex items-center justify-center">
                <Hexagon className="w-5 h-5 text-blue-500" strokeWidth={2} />
            </div>
        </div>
        
        <div className={`ml-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight">Lumina</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2" role="navigation">
        {navItems.map((item) => {
          const isActive = currentMode === item.mode;
          const Icon = item.icon;
          return (
            <button
              key={item.mode}
              onClick={() => setMode(item.mode)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative focus:outline-none focus:ring-2 focus:ring-blue-500/50
                ${isActive 
                  ? 'bg-blue-600/10 text-blue-400 shadow-inner border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} aria-hidden="true" />
              
              <div className={`overflow-hidden transition-all duration-300 whitespace-nowrap
                  ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3 text-left'}
              `}>
                <p className={`text-sm font-medium ${isActive ? 'text-blue-100' : ''}`}>{item.label}</p>
                {/* Improved contrast from text-gray-500 to text-gray-400 */}
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mt-0.5">{item.desc}</p>
              </div>

              {/* Tooltip on hover/focus when collapsed */}
              {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0 duration-200" role="tooltip">
                      {item.label}
                      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                  </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-gray-800/50 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`} aria-hidden={isCollapsed}>
        <div className="flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-xs text-gray-400">Gemini 2.5 Active</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
