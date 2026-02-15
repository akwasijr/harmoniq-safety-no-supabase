import { AuthProvider } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toast";
import { NetworkStatusProvider } from "@/components/shared/network-status";
import { AppDataProvider } from "@/stores/app-data-provider";
import { SyncProvider } from "@/hooks/use-sync";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { AnalyticsTracker } from "@/components/marketing/analytics-tracker";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppDataProvider>
      <AuthProvider>
        <SyncProvider>
          <ToastProvider>
            <NetworkStatusProvider>
              <OfflineIndicator />
              {children}
              <AnalyticsTracker />
            </NetworkStatusProvider>
          </ToastProvider>
        </SyncProvider>
      </AuthProvider>
    </AppDataProvider>
  );
}
