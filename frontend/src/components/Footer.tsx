import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-background/50 px-6 py-4 text-xs text-muted-foreground">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 TriageSync System. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            System Nominal
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span>REST API Ready</span>
        </div>
      </div>
    </footer>
  );
};
