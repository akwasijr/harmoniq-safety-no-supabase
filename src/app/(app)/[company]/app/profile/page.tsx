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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

  // Never fall back to users[0] — that would expose another user's data.
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
    <div className="space-y-6 p-4">
      {/* Hidden file input for photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      
      {/* Profile header */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={`${user.firstName} ${user.lastName}`}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
              {(user.firstName?.[0] || "").toUpperCase()}
              {(user.lastName?.[0] || "").toUpperCase()}
            </div>
          )}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted transition-colors"
            aria-label="Change profile photo"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <h1 className="mt-4 text-xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground capitalize">
          {user.role}
        </p>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Phone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{user.location}</p>
            </div>
          </div>
          {user.department && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Briefcase className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{user.department}</p>
              </div>
            </div>
          )}
          {user.teams.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="font-medium">{user.teams.join(", ")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button 
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
            onClick={() => setShowNotifications(true)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Notifications</p>
              <p className="text-sm text-muted-foreground">
                Manage push and email notifications
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3 rounded-lg p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Moon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Appearance</p>
              <p className="text-sm text-muted-foreground">
                Light, dark, or system theme
              </p>
            </div>
            <ThemeToggle />
          </div>

          <button 
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
            onClick={() => setShowLanguage(true)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Globe className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Language</p>
              <p className="text-sm text-muted-foreground">
                {localeConfig.flag} {localeConfig.name}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>

          <button 
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
            onClick={() => setShowSecurity(true)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Privacy and security</p>
              <p className="text-sm text-muted-foreground">
                Password and account settings
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" className="w-full gap-2 text-destructive" onClick={logout}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>

      {/* App info */}
      <p className="text-center text-xs text-muted-foreground">
        Harmoniq Safety v1.0.0
      </p>

      {/* Notifications Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onKeyDown={(e) => { if (e.key === "Escape") setShowNotifications(false); }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
                </div>
                <Switch checked={notifPrefs.push} onCheckedChange={(v) => handleNotifPrefChange("push", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
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
          aria-label="Language"
          onKeyDown={(e) => { if (e.key === "Escape") setShowLanguage(false); }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Language</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowLanguage(false)} aria-label="Close">
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
          aria-label="Privacy and Security"
          onKeyDown={(e) => { if (e.key === "Escape") setShowSecurity(false); }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Privacy & Security</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSecurity(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Current Password</Label>
                <Input type="password" placeholder="Enter current password" className="mt-1" />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" placeholder="Enter new password" className="mt-1" />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Confirm new password" className="mt-1" />
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast("2FA setup is not available in the demo")}>Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">Manage logged-in devices</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast("Session management is not available in the demo")}>View</Button>
              </div>
            </div>
            <div className="border-t p-4">
              <Button className="w-full" onClick={() => { setShowSecurity(false); toast("Security settings saved"); }}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
