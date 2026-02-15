"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useUsersStore } from "@/stores/users-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";

const STATUS_CONFIG = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  in_review: { label: "In Review", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

const SEVERITY_CONFIG = {
  low: { label: "Low", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-800" },
  critical: { label: "Critical", color: "bg-red-100 text-red-800" },
};

export default function EmployeeIncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.incidentId as string;
  const company = params.company as string;
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();

  const { items: incidents, isLoading } = useIncidentsStore();
  const { items: locations } = useLocationsStore();
  const { items: users } = useUsersStore();

  const incident = incidents.find((i) => i.id === incidentId);
  const location = incident?.location_id ? locations.find((l) => l.id === incident.location_id) : null;
  const reporter = incident?.reporter_id ? users.find((u) => u.id === incident.reporter_id) : null;

  // Ensure this is the user's own incident for read-only view
  const isOwner = incident?.reporter_id === user?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!incident) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-lg font-semibold">Incident Not Found</h1>
        <p className="text-sm text-muted-foreground mt-1">This incident may have been deleted or you don&apos;t have access.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.new;
  const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.low;

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">Incident Report</h1>
          <p className="text-xs text-muted-foreground">#{incident.id.slice(0, 8)}</p>
        </div>
        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-4">
        {/* Title & Type */}
        <div>
          <h2 className="text-lg font-semibold">{incident.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{capitalize(incident.type)}</Badge>
            <Badge className={severityConfig.color}>{severityConfig.label}</Badge>
          </div>
        </div>

        {/* Key Details */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="text-sm font-medium">{formatDate(incident.incident_date)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{location?.name || "Not specified"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Reported By</p>
                <p className="text-sm font-medium">{reporter?.full_name || "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {incident.description || "No description provided."}
            </p>
          </CardContent>
        </Card>

        {/* Timeline/Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reported</p>
                  <p className="text-xs text-muted-foreground">{formatDate(incident.created_at)}</p>
                </div>
              </div>

              {incident.status !== "new" && (
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    incident.status === "in_progress" ? "bg-amber-100" : 
                    incident.status === "in_review" ? "bg-purple-100" : "bg-green-100"
                  }`}>
                    <CheckCircle className={`h-4 w-4 ${
                      incident.status === "in_progress" ? "text-amber-600" : 
                      incident.status === "in_review" ? "text-purple-600" : "text-green-600"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {incident.status === "in_progress" ? "Under Investigation" : 
                       incident.status === "in_review" ? "Under Review" : "Investigation Complete"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(incident.updated_at)}</p>
                  </div>
                </div>
              )}

              {(incident.status === "resolved" || incident.status === "archived") && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Resolved</p>
                    <p className="text-xs text-muted-foreground">{formatDate(incident.updated_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments/Notes if available */}
        {incident.comments && incident.comments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Updates ({incident.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {incident.comments.map((comment) => {
                const author = users.find((u) => u.id === comment.userId);
                return (
                  <div key={comment.id} className="border-l-2 border-muted pl-3 py-1">
                    <p className="text-sm">{comment.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {author?.full_name || comment.user} • {formatDate(comment.date)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Actions if available */}
        {incident.actions && incident.actions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Corrective Actions ({incident.actions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {incident.actions.map((action) => (
                <div key={action.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    action.status === "completed" ? "bg-green-500 border-green-500" : "border-muted-foreground"
                  }`}>
                    {action.status === "completed" && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${action.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {action.dueDate ? formatDate(action.dueDate) : "Not set"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 py-3 bg-muted/30 border-t">
        <p className="text-xs text-muted-foreground text-center">
          This is a read-only view of your incident report. Contact your supervisor for updates.
        </p>
      </div>
    </div>
  );
}
