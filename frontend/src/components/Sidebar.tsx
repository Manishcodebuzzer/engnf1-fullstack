import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Building2,
  CalendarClock,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      to: '/',
      icon: LayoutDashboard,
      badge: null,
      adminOnly: false,
    },
    {
      name: 'Triage Queue',
      to: '/tickets',
      icon: Ticket,
      badge: 'Triage',
      adminOnly: false,
    },
    {
      name: 'Resources & Booking',
      to: '/resources',
      icon: Building2,
      badge: 'Slots',
      adminOnly: false,
    },
    {
      name: 'My Bookings',
      to: '/my-bookings',
      icon: CalendarClock,
      badge: null,
      adminOnly: false,
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            name: 'Admin Panel',
            to: '/admin',
            icon: Shield,
            badge: 'Admin',
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between border-b px-6 md:hidden">
          <span className="font-semibold text-sm">Navigation</span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close Sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main Modules
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? item.adminOnly
                          ? 'bg-rose-600 text-white'
                          : 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-4 w-4', isActive ? 'text-inherit' : 'text-muted-foreground')} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] rounded px-1.5 py-0.5 uppercase tracking-wide font-medium',
                            isActive
                              ? 'bg-black/20 text-inherit'
                              : item.adminOnly
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User Status Card */}
          {user && (
            <div className="mt-6 mx-1 rounded-xl border bg-muted/30 p-3 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-semibold text-foreground">Signed In</span>
              </div>
              <p className="truncate font-medium text-slate-800">{user.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground capitalize">Role: {user.role}</span>
                {user.role === 'ADMIN' && (
                  <span className="text-[9px] bg-rose-100 text-rose-700 font-semibold px-1 rounded">ROOT</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer Info */}
        <div className="border-t p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">TriageSync v1.0.0</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Support triage automation and conflict-free technician slot scheduling.
          </p>
        </div>
      </aside>
    </>
  );
};
