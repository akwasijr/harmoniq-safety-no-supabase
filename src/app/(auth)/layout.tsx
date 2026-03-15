import { AppDataProvider } from "@/stores/app-data-provider";
import { I18nProvider } from "@/i18n";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <AppDataProvider>
        {children}
      </AppDataProvider>
    </I18nProvider>
  );
}
