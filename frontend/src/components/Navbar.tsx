'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const hasUserInteracted = useRef(false);

  // Load zoom level from localStorage on mount (per user)
  useEffect(() => {
    if (!user?.id && !user?.email) {
      // No user yet, initialize to 100%
      document.documentElement.style.setProperty('--admin-zoom', '1');
      setZoomLevel(100);
      return;
    }
    
    const userKey = user.id ? `admin_zoom_level_${user.id}` : `admin_zoom_level_${user.email}`;
    const savedZoom = localStorage.getItem(userKey);
    
    if (savedZoom) {
      const zoom = parseInt(savedZoom, 10);
      setZoomLevel(zoom);
      document.documentElement.style.setProperty('--admin-zoom', `${zoom / 100}`);
    } else {
      // No saved value, initialize to 100%
      document.documentElement.style.setProperty('--admin-zoom', '1');
      setZoomLevel(100);
    }
  }, [user?.id, user?.email]);

  // Apply zoom when zoomLevel changes
  useEffect(() => {
    // Always update CSS variable for zoom to work
    document.documentElement.style.setProperty('--admin-zoom', `${zoomLevel / 100}`);
    
    // Only save to localStorage if user has interacted and user exists
    if (!hasUserInteracted.current || (!user?.id && !user?.email)) {
      return;
    }
    
    const userKey = user.id ? `admin_zoom_level_${user.id}` : `admin_zoom_level_${user.email}`;
    localStorage.setItem(userKey, zoomLevel.toString());
  }, [zoomLevel, user?.id, user?.email]);

  const handleZoomIn = () => {
    hasUserInteracted.current = true;
    const newZoom = Math.min(zoomLevel + 10, 200); // Max 200%
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    hasUserInteracted.current = true;
    const newZoom = Math.max(zoomLevel - 10, 50); // Min 50%
    setZoomLevel(newZoom);
  };

  const handleResetZoom = () => {
    hasUserInteracted.current = true;
    setZoomLevel(100);
  };

  const logout = async () => {
    // ใช้ basePath ในการ redirect หลัง logout
    const loginPath = basePath ? `${basePath}/auth/login` : '/auth/login';
    await signOut({ callbackUrl: loginPath });
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Title (Hidden on mobile with sidebar) */}
          <div className="hidden lg:flex items-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              ระบบจัดการเวชภัณฑ์
            </h2>
          </div>

          {/* Right side - Zoom Control & User menu */}
          <div className="flex items-center ml-auto space-x-4">
            {/* Zoom Control */}
            <div className="flex items-center gap-1 border rounded-md p-1 bg-white mr-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-base min-w-[50px]"
                onClick={handleResetZoom}
                title={`Reset Zoom: ${zoomLevel}%`}
              >
                {zoomLevel}%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 h-9 px-2 sm:px-3 hover:bg-pink-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-base shadow-md ring-2 ring-white flex-shrink-0">
                      {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-lg font-medium text-gray-900">
                        {user?.name || user?.email || 'User'}
                      </div>
                      <div className="text-base text-gray-500 truncate max-w-[120px]">
                        {user?.email || ''}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-lg font-medium leading-none">
                        {user?.name || user?.email || 'User'}
                      </p>
                      <p className="text-base leading-none text-muted-foreground">
                        {user?.email || ''}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center cursor-pointer text-lg">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>ตั้งค่าบัญชี</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer text-lg">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">เข้าสู่ระบบ</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">สมัครสมาชิก</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
