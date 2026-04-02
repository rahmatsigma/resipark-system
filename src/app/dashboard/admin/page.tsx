'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Users, AlertTriangle, CreditCard, ChevronDown, ChevronUp, Bike, Car as CarIcon } from 'lucide-react';

interface ParkingArea {
  capacity: number;
  occupied: number;
  percentage: number;
  motorSlots: number;
  mobilSlots: number;
  currentMotor: number;
  currentMobil: number;
  motorAvailable: number;
  mobilAvailable: number;
}

interface DashboardStats {
  today: {
    totalEntries: number;
    totalExits: number;
    currentParked: number;
    guests: number;
  };
  parking: {
    main: ParkingArea;
    guest: ParkingArea;
  };
  violations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pendingFines: number;
    totalUnpaid: number;
  };
  vehicles: {
    total: number;
    active: number;
    blacklisted: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
  user?: {
    fullName: string;
  } | null;
}

function ParkingAreaCard({ 
  title, 
  area, 
  expanded,
  onToggle 
}: { 
  title: string; 
  area: ParkingArea; 
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>
              {area.occupied} / {area.capacity} slot terisi
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={area.percentage >= 90 ? 'destructive' : 'secondary'}>
              {area.percentage >= 90 ? 'Hampir Penuh' : 'Tersedia'}
            </Badge>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress 
            value={area.percentage} 
            className={`h-3 ${area.percentage >= 90 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Terisi: {area.percentage}%</span>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Motor Section */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bike className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">Motor</span>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {area.motorAvailable} tersedia
                </Badge>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={(area.currentMotor / area.motorSlots) * 100} 
                  className="h-2 [&>div]:bg-emerald-500"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {area.currentMotor} / {area.motorSlots} slot
                  </span>
                  <span className="text-emerald-600 font-medium">
                    {Math.round((area.currentMotor / area.motorSlots) * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Mobil Section */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CarIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">Mobil</span>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {area.mobilAvailable} tersedia
                </Badge>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={(area.currentMobil / area.mobilSlots) * 100} 
                  className="h-2 [&>div]:bg-blue-500"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {area.currentMobil} / {area.mobilSlots} slot
                  </span>
                  <span className="text-blue-600 font-medium">
                    {Math.round((area.currentMobil / area.mobilSlots) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainExpanded, setMainExpanded] = useState(false);
  const [guestExpanded, setGuestExpanded] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetch stats
        const statsResponse = await fetch('/api/dashboard/stats');
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStats(data.data);
        }

        // Fetch activities
        const activitiesResponse = await fetch('/api/dashboard/activities');
        if (activitiesResponse.ok) {
          const data = await activitiesResponse.json();
          setActivities(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kendaraan</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.vehicles.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.vehicles.active || 0} aktif, {stats?.vehicles.blacklisted || 0} blacklist
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parkir Saat Ini</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today.currentParked || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.today.guests || 0} tamu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggaran Hari Ini</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.violations.today || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.violations.thisWeek || 0} minggu ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denda Tertunda</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {((stats?.violations.totalUnpaid || 0)).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.violations.pendingFines || 0} kasus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Parking Capacity */}
      <div className="grid gap-4 md:grid-cols-2">
        <ParkingAreaCard 
          title="Area Parkir Utama" 
          area={stats?.parking.main || {
            capacity: 100,
            occupied: 0,
            percentage: 0,
            motorSlots: 50,
            mobilSlots: 50,
            currentMotor: 0,
            currentMobil: 0,
            motorAvailable: 50,
            mobilAvailable: 50,
          }}
          expanded={mainExpanded}
          onToggle={() => setMainExpanded(!mainExpanded)}
        />
        
        <ParkingAreaCard 
          title="Area Parkir Tamu" 
          area={stats?.parking.guest || {
            capacity: 20,
            occupied: 0,
            percentage: 0,
            motorSlots: 10,
            mobilSlots: 10,
            currentMotor: 0,
            currentMobil: 0,
            motorAvailable: 10,
            mobilAvailable: 10,
          }}
          expanded={guestExpanded}
          onToggle={() => setGuestExpanded(!guestExpanded)}
        />
      </div>

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Hari Ini</CardTitle>
          <CardDescription>Aktivitas masuk dan keluar kendaraan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <div className="text-3xl font-bold text-emerald-600">{stats?.today.totalEntries || 0}</div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300">Kendaraan Masuk</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats?.today.totalExits || 0}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Kendaraan Keluar</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{stats?.today.guests || 0}</div>
              <div className="text-sm text-amber-700 dark:text-amber-300">Tamu Aktif</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terkini</CardTitle>
          <CardDescription>Log aktivitas sistem terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Belum ada aktivitas
              </p>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.module}
                      </Badge>
                      <span className="text-sm font-medium">{activity.action}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.user?.fullName || 'System'} • {new Date(activity.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
