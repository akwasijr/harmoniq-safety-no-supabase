"use client";

import * as React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  Moon,
  Globe,
  LogOut,
  ChevronRight,
  Camera,
  X,
  Check,
  Briefcase,
  Users,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { useLocationsStore } from "@/stores/locations-store";
import { useTeamsStore } from "@/stores/teams-store";
import { useUsersStore } from "@/stores/users-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation, SUPPORTED_LOCALES } from "@/i18n";

export default function EmployeeProfilePage() {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showLanguage, setShowLanguage] = React.useState(false);
  const [showSecurity, setShowSecurity] = React.useState(false);
  const [notifPrefs, setNotifPrefs] = React.useState({
    push: true,
    email: true,
    incidents: true,
    tasks: true,
    news: false,
  });

  const { locale, setLocale, t, config: localeConfig } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = React.useState(locale);
  const { items: locations } = useLocationsStore();
  const { items: teams } = useTeamsStore();
  const { update: updateUser } = useUsersStore();
  const { user: authUser, logout } = useAuth();
  const { toast } = useToast();
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // Load notification preferences from user on mount
  React.useEffect(() => {
    if (authUser?.notification_prefs) {
      setNotifPrefs(authUser.notification_prefs);
    }
  }, [authUser?.notification_prefs]);

  // Save notification preferences when changed
  const handleNotifPrefChange = (key: keyof typeof notifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    if (authUser) {
      updateUser(authUser.id, { notification_prefs: updated });
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast("Image too large. Max size is 2MB.");
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateUser(authUser.id, { avatar_url: dataUrl });
      toast("Profile photo updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Never fall back to users[0]. That would expose another user's data.
  // If authUser is null the user is not authenticated.
  if (!authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  const currentUser = authUser;
  
  // Get user's location
  const userLocation = currentUser.location_id 
    ? locations.find(l => l.id === currentUser.location_id)
    : null;
  
  // Get user's teams
  const userTeams = currentUser.team_ids 
    ? teams.filter(t => currentUser.team_ids?.includes(t.id))
    : [];

  const user = {
    firstName: currentUser.first_name || "",
    lastName: currentUser.last_name || "",
    email: currentUser.email || "",
    phone: currentUser.employee_id ? `Ext. ${currentUser.employee_id}` : "Not set",
    role: currentUser.role || "employee",
    location: userLocation?.name || "Not assigned",
    teams: userTeams.map(t => t.name),
    joinedAt: currentUser.created_at,
    department: currentUser.department,
    jobTitle: currentUser.job_title,
  };

  const languages = SUPPORTED_LOCALES;

  return (
    <div className="flex flex-col min-h-full">
      {/* Hidden file input for photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Profile header - deep purple continuation */}
      <div className="bg-primary px-5 pt-4 pb-8 text-center">
        <div className="relative inline-block">
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={`${user.firstName} ${user.lastName}`}
              className="h-20 w-20 rounded-full border-[3px] border-white/30 object-cover mx-auto"
            />
          ) : (
            <div className="h-20 w-20 rounded-full border-[3px] border-white/30 bg-white/10 flex items-center justify-center text-xl font-bold text-white mx-auto">
              {(user.firstName?.[0] || "").toUpperCase()}
              {(user.lastName?.[0] || "").toUpperCase()}
            </div>
          )}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white  hover:bg-gray-100 transition-colors"
            aria-label={t("common.changeProfilePhoto")}
          >
            <Camera className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
        <h1 className="mt-3 text-lg font-bold text-white">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-white/50 capitalize">{user.role}</p>
      </div>

      {/* Contact Info section */}
      <div className="px-4 mt-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("profile.contactInfo") || "Contact Info"}
        </h3>
        <div className="rounded-xl bg-card overflow-hidden ">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>
          <div className="border-t border-border/50 mx-4" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Phone className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{user.phone}</p>
            </div>
          </div>
          <div className="border-t border-border/50 mx-4" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <MapPin className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium">{user.location}</p>
            </div>
          </div>
          {user.department && (
            <>
              <div className="border-t border-border/50 mx-4" />
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Briefcase className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">{user.department}</p>
                </div>
              </div>
            </>
          )}
          {user.teams.length > 0 && (
            <>
              <div className="border-t border-border/50 mx-4" />
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Users className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Teams</p>
                  <p className="text-sm font-medium">{user.teams.join(", ")}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings section */}
      <div className="px-4 mt-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("profile.settings") || "Settings"}
        </h3>
        <div className="rounded-xl bg-card overflow-hidden ">
          <button
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors hover:bg-muted/50"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("profile.notifications")}</p>
              <p className="text-xs text-muted-foreground">{t("profile.notificationsDesc")}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>

          <div className="border-t border-border/50 mx-4" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Moon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">Light, dark, or system</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t border-border/50 mx-4" />
          <button
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors hover:bg-muted/50"
            onClick={() => setShowLanguage(true)}
          >
            <Globe className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("profile.language")}</p>
              <p className="text-xs text-muted-foreground">{localeConfig.flag} {localeConfig.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>

          <div className="border-t border-border/50 mx-4" />
          <button
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors hover:bg-muted/50"
            onClick={() => setShowSecurity(true)}
          >
            <Shield className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("profile.security")}</p>
              <p className="text-xs text-muted-foreground">Password and account</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* About section */}
      <div className="px-4 mt-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          About
        </h3>
        <div className="rounded-xl bg-card overflow-hidden ">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <p className="text-sm flex-1">Terms & Conditions</p>
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </div>
          <div className="border-t border-border/50 mx-4" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Shield className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <p className="text-sm flex-1">Privacy Policy</p>
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-4 mt-5 mb-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-card  py-3.5 text-red-600 font-medium text-sm transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t("profile.signOut") || "Sign Out"}
        </button>
      </div>

      {/* App info */}
      <p className="text-center text-xs text-muted-foreground mb-6">
        Harmoniq Safety v1.0.0
      </p>

      {/* Notifications Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("common.notifications")}
          onKeyDown={(e) => { if (e.key === "Escape") setShowNotifications(false); }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">{t("profile.notifications")}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)} aria-label={t("common.close")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("profile.pushNotifications")}</p>
                  <p className="text-sm text-muted-foreground">{t("profile.pushNotificationsDesc")}</p>
                </div>
                <Switch checked={notifPrefs.push} onCheckedChange={(v) => handleNotifPrefChange("push", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("profile.emailNotifications")}</p>
                  <p className="text-sm text-muted-foreground">{t("profile.emailNotificationsDesc")}</p>
                </div>
                <Switch checked={notifPrefs.email} onCheckedChange={(v) => handleNotifPrefChange("email", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Incidents</p>
                  <p className="text-sm text-muted-foreground">Alert when new incidents are reported</p>
                </div>
                <Switch checked={notifPrefs.incidents} onCheckedChange={(v) => handleNotifPrefChange("incidents", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Task Reminders</p>
                  <p className="text-sm text-muted-foreground">Remind about pending tasks</p>
                </div>
                <Switch checked={notifPrefs.tasks} onCheckedChange={(v) => handleNotifPrefChange("tasks", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">News & Announcements</p>
                  <p className="text-sm text-muted-foreground">Company news and updates</p>
                </div>
                <Switch checked={notifPrefs.news} onCheckedChange={(v) => handleNotifPrefChange("news", v)} />
              </div>
            </div>
            <div className="border-t p-4">
              <Button className="w-full" onClick={() => { setShowNotifications(false); toast("Notification preferences saved"); }}>Save Preferences</Button>
            </div>
          </div>
        </div>
      )}

      {/* Language Modal */}
      {showLanguage && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("profile.language")}
          onKeyDown={(e) => { if (e.key === "Escape") setShowLanguage(false); }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Language</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowLanguage(false)} aria-label={t("common.close")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${selectedLanguage === lang.code ? "bg-primary/10" : "hover:bg-muted"}`}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setLocale(lang.code);
                    setShowLanguage(false);
                    toast(t("profile.language_changed"));
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({lang.englishName})</span>
                    </div>
                  </div>
                  {selectedLanguage === lang.code && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Modal */}
      {showSecurity && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("profile.privacySecurity")}
          onKeyDown={(e) => { if (e.key === "Escape") setShowSecurity(false); }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Privacy & Security</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSecurity(false)} aria-label={t("common.close")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
              {/* Password change (coming soon) */}
              <div>
                <p className="font-medium mb-2">Change Password</p>
                <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("common.comingSoon")}</p>
                </div>
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">{t("common.comingSoon")}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">Manage logged-in devices</p>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">{t("common.comingSoon")}</Badge>
              </div>
            </div>
            <div className="border-t p-4">
              <Button className="w-full" onClick={() => setShowSecurity(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
