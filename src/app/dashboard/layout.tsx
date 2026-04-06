'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Car,
  LogIn,
  LogOut,
  User,
  LayoutDashboard,
  Users,
  AlertTriangle,
  Ban,
  FileText,
  Settings,
  ChevronUp,
  Menu,
} from 'lucide-react';
import { ROLE_LABELS, getInitials, getAvatarColor } from '@/lib/utils';

interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SATPAM' | 'WARGA' | 'PENGELOLA';
  houseId?: string;
  houseNumber?: string;
}

const adminMenuItems = [
  { title: 'Dashboard', url: '/dashboard/admin', icon: LayoutDashboard },
  { title: 'Kendaraan', url: '/dashboard/admin/vehicles', icon: Car },
  { title: 'Akses Masuk/Keluar', url: '/dashboard/admin/access', icon: LogIn },
  { title: 'Pelanggaran', url: '/dashboard/admin/violations', icon: AlertTriangle },
  { title: 'Blacklist', url: '/dashboard/admin/blacklist', icon: Ban },
  { title: 'Pengguna', url: '/dashboard/admin/users', icon: Users },
  { title: 'Laporan', url: '/dashboard/admin/reports', icon: FileText },
];

const satpamMenuItems = [
  { title: 'Dashboard', url: '/dashboard/satpam', icon: LayoutDashboard },
  { title: 'Akses Masuk', url: '/dashboard/satpam/entry', icon: LogIn },
  { title: 'Akses Keluar', url: '/dashboard/satpam/exit', icon: LogOut },
  { title: 'Parkir Tamu', url: '/dashboard/satpam/guests', icon: User },
  { title: 'Pelanggaran', url: '/dashboard/satpam/violations', icon: AlertTriangle },
];

const wargaMenuItems = [
  { title: 'Dashboard', url: '/dashboard/warga', icon: LayoutDashboard },
  { title: 'Kendaraan Saya', url: '/dashboard/warga/vehicles', icon: Car },
  { title: 'Riwayat Akses', url: '/dashboard/warga/history', icon: LogIn },
  { title: 'Pelanggaran', url: '/dashboard/warga/violations', icon: AlertTriangle },
];

const pengelolaMenuItems = [
  { title: 'Dashboard', url: '/dashboard/pengelola', icon: LayoutDashboard },
  { title: 'Statistik', url: '/dashboard/pengelola/statistics', icon: FileText },
  { title: 'Laporan', url: '/dashboard/pengelola/reports', icon: FileText },
];

function getMenuItems(role: string) {
  switch (role) {
    case 'ADMIN':
      return adminMenuItems;
    case 'SATPAM':
      return satpamMenuItems;
    case 'WARGA':
      return wargaMenuItems;
    case 'PENGELOLA':
      return pengelolaMenuItems;
    default:
      return [];
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
        } else {
          router.push('/');
        }
      } catch (error) {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Idle timeout tracker - update activity every 30 seconds if active
  const updateUserActivity = useCallback(async () => {
    try {
      await fetch('/api/auth/activity', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.log('Activity update failed (possibly logged out)');
    }
  }, []);

  useEffect(() => {
    let activityTimer: NodeJS.Timeout;
    
    const handleUserActivity = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(updateUserActivity, 25000); // Update every 25s
    };

    // Track user activity
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Initial update
    handleUserActivity();

    return () => {
      ['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      clearTimeout(activityTimer);
    };
  }, [updateUserActivity]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = getMenuItems(user.role);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-gray-200 dark:border-gray-800">
          <SidebarHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">SIPARKIR</span>
                <span className="text-xs text-muted-foreground">Manajemen Parkir</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className="data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700 dark:data-[active=true]:bg-emerald-950 dark:data-[active=true]:text-emerald-300"
                      >
                        <a href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 dark:border-gray-800">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`text-xs text-white ${getAvatarColor(user.fullName)}`}>
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                      </div>
                      <ChevronUp className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="w-56">
                    <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 bg-white dark:bg-gray-950">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {menuItems.find((item) => item.url === pathname)?.title || 'Dashboard'}
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </div>
          </header>

          <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
