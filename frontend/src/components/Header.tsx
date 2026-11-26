import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Menu, Server, LogOut, LogIn, User as UserIcon } from 'lucide-react';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { health, isChecking, refetch } = useHealthCheck();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const isHealthy = health?.status === 'healthy';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TriageSync
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-muted-foreground border-l pl-2">
                Ticket Triage & Slot Scheduling
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Backend Health Indicator */}
          <div className="hidden sm:flex items-center gap-2 border rounded-full px-3 py-1 bg-muted/40 text-xs">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Backend:</span>
            {isChecking ? (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 animate-pulse">
                Checking...
              </Badge>
            ) : isHealthy ? (
              <button
                onClick={refetch}
                title="Backend is operational. Click to recheck."
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Connected</span>
              </button>
            ) : (
              <button
                onClick={refetch}
                title="Backend unreachable. Click to retry."
                className="flex items-center gap-1 text-red-500 hover:text-red-600 font-medium cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span>Offline</span>
              </button>
            )}
          </div>

          {/* User Authentication Status */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l">
              <div className="flex flex-col text-right hidden sm:block">
                <span className="text-xs font-semibold leading-tight text-foreground">{user.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{user.email}</span>
              </div>

              <Badge
                variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}
                className="text-[10px] font-mono uppercase tracking-wider py-0.5 px-2"
              >
                {user.role}
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Log Out"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="gap-1.5 text-xs">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Register</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
