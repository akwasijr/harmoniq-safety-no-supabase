"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Building,
  Building2,
  Layers,
  LayoutGrid,
  DoorOpen,
  AlertTriangle,
  FileText,
  Wrench,
  Phone,
  Info,
  ChevronRight,
  Clock,
  Users,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockLocationEmergencyContacts, mockLocationSafetyNotices } from "@/mocks/data";
import { useLocationsStore } from "@/stores/locations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { LocationType } from "@/types";
import { useTranslation } from "@/i18n";

// Location type configurations (matching dashboard)
const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  site: "Campus",
  building: "Building",
  floor: "Floor",
  zone: "Zone",
  room: "Room",
};

const LOCATION_TYPE_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  site: Building2,
  building: Building,
  floor: Layers,
  zone: LayoutGrid,
  room: DoorOpen,
};

export default function LocationLandingPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const locationId = routeParams.locationId as string;

  const { items: locations } = useLocationsStore();
  const { items: incidents } = useIncidentsStore();
  const { t } = useTranslation();

  const location = locations.find((l) => l.id === locationId);

  // Get parent location if exists
  const parentLocation = location?.parent_id 
    ? locations.find((l) => l.id === location.parent_id) 
    : null;

  // Get emergency contacts for this location (or inherit from parent/default)
  const getEmergencyContacts = () => {
    // Try to get contacts for this location
    let contacts = mockLocationEmergencyContacts.filter(c => c.location_id === locationId);
    
    // If no contacts, try parent location
    if (contacts.length === 0 && location?.parent_id) {
      contacts = mockLocationEmergencyContacts.filter(c => c.location_id === location.parent_id);
    }
    
    // If still no contacts, try grandparent (e.g., get campus contacts for a zone)
    if (contacts.length === 0 && parentLocation?.parent_id) {
      contacts = mockLocationEmergencyContacts.filter(c => c.location_id === parentLocation.parent_id);
    }
    
    // Default contacts if none found
    if (contacts.length === 0) {
      return [
        { id: "default_1", location_id: locationId, name: "Emergency Services", role: "Emergency", phone: "911", is_primary: true },
      ];
    }
    
    return contacts;
  };
  
  const emergencyContacts = getEmergencyContacts();

  // Get safety notices for this location (or inherit from parent)
  const getSafetyNotices = () => {
    // Get notices for this location
    let notices = mockLocationSafetyNotices.filter(n => 
      n.location_id === locationId && n.is_active
    );
    
    // Also get notices from parent locations (they apply to children too)
    if (location?.parent_id) {
      const parentNotices = mockLocationSafetyNotices.filter(n => 
        n.location_id === location.parent_id && n.is_active
      );
      notices = [...notices, ...parentNotices];
    }
    
    if (parentLocation?.parent_id) {
      const grandparentNotices = mockLocationSafetyNotices.filter(n => 
        n.location_id === parentLocation.parent_id && n.is_active
      );
      notices = [...notices, ...grandparentNotices];
    }
    
    // Remove duplicates by id
    const uniqueNotices = notices.filter((n, i, arr) => 
      arr.findIndex(x => x.id === n.id) === i
    );
    
    return uniqueNotices;
  };
  
  const safetyNotices = getSafetyNotices();
  
  // Calculate days without incident for this location
  const calculateDaysWithoutIncident = (): number => {
    // Get all descendant location IDs
    const getAllDescendantIds = (id: string): string[] => {
      const children = locations.filter(l => l.parent_id === id);
      const childIds = children.map(c => c.id);
      const descendantIds = children.flatMap(c => getAllDescendantIds(c.id));
      return [id, ...childIds, ...descendantIds];
    };
    
    const locationIds = getAllDescendantIds(locationId);
    
    // Find the most recent incident at any of these locations
    const recentIncident = incidents
      .filter(inc => locationIds.includes(inc.location_id || ""))
      .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())[0];
    
    if (!recentIncident) {
      // No incidents, calculate from location creation date
      if (location) {
        const createdDate = new Date(location.created_at);
        const today = new Date();
        return Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return 365;
    }
    
    const incidentDate = new Date(recentIncident.incident_date);
    const today = new Date();
    return Math.floor((today.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  const daysWithoutIncident = calculateDaysWithoutIncident();

  // Quick actions for this location
  const quickActions = [
    {
      id: "report",
      title: t("locations.reportIncident"),
      description: t("locations.reportIncidentDesc"),
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      href: `/${company}/app/report?location=${locationId}`,
    },
    {
      id: "checklist",
      title: t("locations.completeChecklist"),
      description: t("locations.completeChecklistDesc"),
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: `/${company}/app/checklists?location=${locationId}`,
    },
    {
      id: "inspection",
      title: t("locations.assetInspection"),
      description: t("locations.assetInspectionDesc"),
      icon: Wrench,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      href: `/${company}/app/checklists?tab=inspections&location=${locationId}`,
    },
  ];

  if (!location) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">{t("locations.locationNotFound")}</h1>
        <p className="text-muted-foreground text-center mb-6">
          {t("locations.locationNotFoundDesc")}
        </p>
        <Button onClick={() => router.push(`/${company}/app`)}>
          {t("locations.goToHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${company}/app`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("locations.home")}
          </Button>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {t("locations.scannedLocation")}
          </span>
        </div>
      </header>

      {/* Location Info */}
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                {React.createElement(LOCATION_TYPE_ICONS[location.type] || Building, { className: "h-8 w-8 text-primary" })}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold">{location.name}</h1>
                {parentLocation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {parentLocation.name}
                  </p>
                )}
                {location.address && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {location.address}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">
                    {LOCATION_TYPE_LABELS[location.type] || location.type}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety Notices */}
      {safetyNotices.length > 0 && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {safetyNotices.map((notice) => (
              <div
                key={notice.id}
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  notice.type === "warning"
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
                }`}
              >
                {notice.type === "warning" ? (
                  <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                )}
                <p className="text-sm font-medium">{notice.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {t("locations.quickActions")}
        </h2>
        <div className="space-y-3">
          {quickActions.map((action) => (
            <Link key={action.id} href={action.href}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`rounded-full ${action.bgColor} p-3`}>
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {t("locations.emergencyContacts")}
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            {emergencyContacts.map((contact, i) => (
              <a
                key={i}
                href={`tel:${contact.phone}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="rounded-full bg-red-500/10 p-2">
                  <Phone className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                </div>
                <span className="text-sm font-medium text-primary">{contact.phone}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Location Stats */}
      <div className="px-4 pb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {t("locations.locationInfo")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{daysWithoutIncident}</p>
              <p className="text-xs text-muted-foreground">{t("locations.daysSafe")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{location?.employee_count || 0}</p>
              <p className="text-xs text-muted-foreground">{t("locations.workers")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Wrench className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{location?.asset_count || 0}</p>
              <p className="text-xs text-muted-foreground">{t("locations.assets")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
