import React from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';

export default function KanbanPage() {
  return (
    <div className="h-full flex flex-col space-y-4">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kanban</h2>
          <p className="text-foreground/60 mt-1">Arraste os leads para atualizar seus status operacionalmente.</p>
        </div>
        <div className="flex space-x-2">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
            + Novo Lead Manual
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
}
