'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FileBarChart, FileText, ClipboardList, ArrowRight, TrendingUp, RotateCcw, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ReportsPage() {
  const { user } = useAuth();

  const reports = [
    {
      id: 'comparison',
      title: 'รายงานเปรียบเทียบการเบิกอุปกรณ์',
      description: 'เปรียบเทียบจำนวนเบิกกับการบันทึกใช้กับคนไข้ พร้อมสรุปผลการตรวจสอบ',
      icon: FileBarChart,
      color: 'blue',
      href: '/medical-supplies/comparison',
      features: [
        'เปรียบเทียบจำนวนเบิกกับจำนวนที่ใช้',
        'แสดงสถานะ Match/Not Match',
        'สรุปผลการตรวจสอบ',
        'Export เป็น Excel, PDF, หรือ CSV'
      ]
    },
    {
      id: 'equipment-usage',
      title: 'รายงานการใช้อุปกรณ์กับคนไข้',
      description: 'รายงานการใช้อุปกรณ์กับคนไข้ตามเงื่อนไขที่กำหนด',
      icon: ClipboardList,
      color: 'green',
      href: '/medical-supplies/equipment-usage',
      features: [
        'กรองตามวันที่, โรงพยาบาล, แผนก',
        'แสดงรายละเอียดการใช้อุปกรณ์',
        'รองรับการกรองด้วย Usage IDs',
        'Export เป็น Excel หรือ PDF'
      ]
    },
    {
      id: 'equipment-disbursement',
      title: 'รายงานการรับบันทึกตัดจ่ายอุปกรณ์',
      description: 'รายงานการบันทึกตัดจ่ายอุปกรณ์พร้อมสรุปผลรวม',
      icon: FileText,
      color: 'purple',
      href: '/medical-supplies/equipment-disbursement',
      features: [
        'แสดงรายการตัดจ่ายแต่ละรายการ',
        'แสดงวันที่, เวลา, ผู้บันทึก',
        'สรุปผลรวมของแต่ละอุปกรณ์',
        'Export เป็น Excel หรือ PDF'
      ]
    },
    {
      id: 'vending-reports',
      title: 'รายงาน Vending',
      description: 'รายงานการ Mapping และการเบิกอุปกรณ์จาก Vending',
      icon: TrendingUp,
      color: 'blue',
      href: '/medical-supplies/vending-reports',
      features: [
        'รายงาน Mapping Vending กับ HIS',
        'รายงานการเบิกที่ Mapping ไม่ได้',
        'รายงานรายการที่เบิกแล้วแต่ไม่ได้ใช้',
        'Export เป็น Excel หรือ PDF'
      ]
    },
    {
      id: 'cancel-bill-report',
      title: 'รายงานยกเลิก Bill',
      description: 'รายงานการยกเลิก Bill และใบเสร็จ',
      icon: Receipt,
      color: 'red',
      href: '/medical-supplies/cancel-bill-report',
      features: [
        'แสดงรายการที่ยกเลิก Bill',
        'กรองตามวันที่',
        'แสดงสถานะการยกเลิก',
        'Export เป็น Excel หรือ PDF'
      ]
    },
    {
      id: 'return-report',
      title: 'รายงานอุปกรณ์ที่ไม่ถูกใช้งาน',
      description: 'รายงานอุปกรณ์ที่ไม่ถูกใช้งานทั้งหมด',
      icon: RotateCcw,
      color: 'green',
      href: '/medical-supplies/reports/return-report',
      features: [
        'แสดงประวัติการคืนเวชภัณฑ์',
        'กรองตามวันที่และสาเหตุ',
        'แสดงรายละเอียดการคืน',
        'Export เป็น Excel หรือ PDF'
      ]
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; icon: string; button: string } } = {
      blue: {
        bg: 'bg-blue-100',
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        bg: 'bg-green-100',
        icon: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      },
      purple: {
        bg: 'bg-purple-100',
        icon: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      red: {
        bg: 'bg-red-100',
        icon: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <FileBarChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  รายงานทางการแพทย์
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  เลือกรายงานที่ต้องการสร้าง
                </p>
              </div>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => {
              const Icon = report.icon;
              const colors = getColorClasses(report.color);

              return (
                <Card key={report.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 ${colors.bg} rounded-lg`}>
                        <Icon className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                    </div>
                    <CardTitle className="mt-4">{report.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {report.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">คุณสมบัติ:</h4>
                      <ul className="space-y-1 mb-4">
                        {report.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link href={report.href}>
                      <Button className={`w-full ${colors.button} text-white`}>
                        เปิดรายงาน
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle>ข้อมูลเพิ่มเติม</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-700 mb-1">รูปแบบไฟล์</p>
                  <p className="text-gray-600">Excel (.xlsx), PDF (.pdf), CSV (.csv)</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 mb-1">การกรองข้อมูล</p>
                  <p className="text-gray-600">ตามวันที่, โรงพยาบาล, แผนก, หรือ Usage ID</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 mb-1">การใช้งาน</p>
                  <p className="text-gray-600">คลิกที่รายงานเพื่อเปิดและสร้างรายงาน</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

