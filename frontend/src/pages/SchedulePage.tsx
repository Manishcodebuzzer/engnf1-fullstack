import React from 'react';
import { CalendarClock, Plus, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';

export const SchedulePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Slot Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Technician availability slots, appointment management, and double-booking prevention.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Calendar className="h-4 w-4" />
            <span>View Calendar</span>
          </Button>
          <Button size="sm" disabled className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Slot</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CalendarClock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold">Scheduling Module Scaffolding Ready</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Technician slot management, booking workflows, and calendar synchronizations will be integrated in the subsequent feature implementation phase.
        </p>
      </div>
    </div>
  );
};
