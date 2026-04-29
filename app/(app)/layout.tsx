import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-[88px]">
      {children}
      <BottomNav />
    </div>
  );
}
