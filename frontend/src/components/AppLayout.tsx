'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface AppLayoutProps {
  children: ReactNode;
  /** ใช้ความกว้างเต็ม (ไม่มี max-width) เหมาะกับ Dashboard */
  fullWidth?: boolean;
}

const ADMIN_SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export default function AppLayout({ children, fullWidth }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const skipInitialPersist = useRef(true);

  // โหลดการหุบ/กางจากเครื่อง (หลัง mount เพื่อไม่ให้ SSR/hydration คนละค่า)
  useEffect(() => {
    try {
      if (localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === '1') {
        setIsCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // จำค่าที่ผู้ใช้เลือก — เปลี่ยนหน้าในแอปไม่รีเซ็ต state; รีเฟรชก็ยังหุบ/กางตามเดิม
  // ข้ามครั้งแรกเพื่อไม่เขียน '0' ทับก่อน effect ด้านบนจะ setState จาก localStorage
  useEffect(() => {
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, isCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Sync zoom level with CSS variable (set by Navbar)
  useEffect(() => {
    // Read initial value from CSS variable
    const currentZoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--admin-zoom') || '1') * 100;
    setZoomLevel(currentZoom);

    // Listen for changes to CSS variable
    const checkZoom = () => {
      const newZoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--admin-zoom') || '1') * 100;
      if (Math.abs(newZoom - zoomLevel) > 0.1) {
        setZoomLevel(newZoom);
      }
    };

    const interval = setInterval(checkZoom, 100);
    return () => clearInterval(interval);
  }, [zoomLevel]);

  return (
    <div className="flex h-screen bg-rose-50/30 overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content — Sidebar ใช้ lg:sticky ในแถว flex (สไตล์เดียว StaffLayout) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out motion-reduce:transition-none">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto" style={{ zoom: zoomLevel / 100 }}>
          <div
            className={
              fullWidth
                ? 'w-full max-w-full px-4 sm:px-6 lg:px-8 py-6'
                : 'container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl'
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
