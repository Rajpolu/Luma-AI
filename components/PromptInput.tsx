
import React from 'react';
import { Send, Sparkles } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  placeholder?: string;
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  loading, 
  placeholder 
}) => {
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-end gap-2 bg-gray-800 p-2 rounded-2xl border border-gray-700 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-lg">
        <textarea
          className="w-full bg-transparent border-none text-gray-100 placeholder-gray-500 focus:ring-0 resize-none min-h-[50px] max-h-[150px] py-3 pl-3"
          placeholder={placeholder || "Describe what you want to create..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
          aria-label="Prompt input"
        />
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          aria-label="Send prompt"
          className={`p-3 rounded-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400
            ${loading || !value.trim() 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
            }`}
        >
          {loading ? (
            <Sparkles className="animate-spin" size={20} aria-hidden="true" />
          ) : (
            <Send size={20} aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="absolute -bottom-6 left-2 text-xs text-gray-500">
        Press Enter to send
      </div>
    </div>
  );
};

export default PromptInput;
