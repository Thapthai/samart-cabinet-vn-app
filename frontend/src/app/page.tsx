'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ASSETS } from '@/lib/assets';
import { Package, Users, BarChart3, Shield, Sparkles, User } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const isAdmin = (user as { is_admin?: boolean }).is_admin === true;
      router.push(isAdmin ? '/admin/dashboard' : '/staff/dashboard');
    }
  }, [isAuthenticated, loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-2 sm:pb-4 md:pb-6 lg:pb-8">
              <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="text-center">
                  {/* Logo */}
                  <div className="flex justify-center mb-8">
                    <img
                      src={ASSETS.LOGO}
                      alt="POSE Logo"
                      width={120}
                      height={120}
                      className="object-contain"
                    />
                  </div>

                  <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                    <span className="block">ระบบจัดการเวชภัณฑ์</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mt-2">
                      ที่ทันสมัยและครบครัน
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 sm:text-xl">
                    จัดการเวชภัณฑ์และอุปกรณ์ทางการแพทย์ได้อย่างมีประสิทธิภาพ
                    พร้อมระบบรายงานและการติดตาม
                  </p>

                  {/* Action Buttons */}
                  <div className="mt-10 max-w-2xl mx-auto px-4">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                      <Link href="/auth/login" className="w-full sm:w-auto sm:min-w-[200px]">
                        <Button
                          size="lg"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <User className="mr-2 h-5 w-5" />
                          เข้าสู่ระบบ
                        </Button>
                      </Link>
                    </div>
                  </div>

                </div>
              </main>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="pt-0 pb-6 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">
                ฟีเจอร์หลัก
              </h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                ทุกสิ่งที่คุณต้องการสำหรับการจัดการธุรกิจ
              </p>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="text-center">
                  <CardHeader>
                    <Package className="h-12 w-12 text-blue-600 mx-auto" />
                    <CardTitle className="text-lg">จัดการอุปกรณ์</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      เพิ่ม แก้ไข และจัดการเวชภัณฑ์ได้อย่างง่ายดาย
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Users className="h-12 w-12 text-blue-600 mx-auto" />
                    <CardTitle className="text-lg">จัดการผู้ใช้</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      ระบบผู้ใช้ที่ปลอดภัย พร้อมการจัดการสิทธิ์การเข้าถึง
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <BarChart3 className="h-12 w-12 text-blue-600 mx-auto" />
                    <CardTitle className="text-lg">รายงานและสถิติ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      ดูข้อมูลสถิติและรายงานการขายแบบเรียลไทม์
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Shield className="h-12 w-12 text-blue-600 mx-auto" />
                    <CardTitle className="text-lg">ความปลอดภัย</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      ระบบรักษาความปลอดภัยขั้นสูงด้วย JWT Authentication
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* Footer Section */}
      <footer className="mt-auto bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-3.5">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="text-xs text-blue-100">
              © 2026 ระบบจัดการเวชภัณฑ์ · All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>

  );
}