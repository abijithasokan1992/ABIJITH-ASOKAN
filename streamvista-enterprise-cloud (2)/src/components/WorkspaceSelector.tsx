
import React from 'react';
import { Workspace } from '../types';
import { ChevronRight } from 'lucide-react';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
}

export default function WorkspaceSelector({ workspaces, onSelectWorkspace }: WorkspaceSelectorProps) {

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in py-12">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Choose Workspace</h2>
        <p className="text-xs text-zinc-500">Select an approved organization to access.</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
        >
          Back to Login
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-2">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => onSelectWorkspace(ws)}
            className="w-full flex items-center justify-between p-4 border border-zinc-200 rounded-lg hover:border-zinc-900 transition-all text-left"
          >
            <div>
              <span className="block font-bold text-sm text-zinc-900">{ws.name}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{ws.role} Role</span>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
