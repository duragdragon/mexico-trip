import BottomNav from '@/components/BottomNav';
import HydrationProvider from '@/components/HydrationProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrationProvider>
      <div className="min-h-dvh pb-[88px]">{children}<BottomNav /></div>
    </HydrationProvider>
  );
}
