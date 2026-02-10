import { AuthProvider } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toast";
import { NetworkStatusProvider } from "@/components/shared/network-status";
import { AppDataProvider } from "@/stores/app-data-provider";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";

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
            <ServiceWorkerRegistration />
            {children}
          </NetworkStatusProvider>
        </ToastProvider>
      </AuthProvider>
    </AppDataProvider>
  );
}
