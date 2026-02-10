import { AppDataProvider } from "@/stores/app-data-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppDataProvider>
      {children}
    </AppDataProvider>
  );
}
