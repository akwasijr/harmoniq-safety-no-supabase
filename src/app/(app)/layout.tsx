import { AuthProvider } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "sonner";
import { NetworkStatusProvider } from "@/components/shared/network-status";
import { AppDataProvider } from "@/stores/app-data-provider";
import { SyncProvider } from "@/hooks/use-sync";
import { OfflineIndicator } from "@/components/shared/offline-indicator";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppDataProvider>
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <SyncProvider>
          <ToastProvider>
            <NetworkStatusProvider>
              <OfflineIndicator />
              {children}
            </NetworkStatusProvider>
          </ToastProvider>
        </SyncProvider>
      </AuthProvider>
    </AppDataProvider>
  );
}
