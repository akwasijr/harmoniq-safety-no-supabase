import { AuthProvider } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toast";
import { NetworkStatusProvider } from "@/components/shared/network-status";
import { AppDataProvider } from "@/stores/app-data-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppDataProvider>
      <AuthProvider>
        <ToastProvider>
          <NetworkStatusProvider>
            {children}
          </NetworkStatusProvider>
        </ToastProvider>
      </AuthProvider>
    </AppDataProvider>
  );
}
