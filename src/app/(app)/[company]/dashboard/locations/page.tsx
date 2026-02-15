"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  MapPin,
  Building,
  Building2,
  X,
  ChevronRight,
  ChevronDown,
  Layers,
  FolderTree,
  Edit,
  LayoutGrid,
  DoorOpen,
  Download,
  Copy,
  Trash2,
  Users,
  Wrench,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocationsStore } from "@/stores/locations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useUsersStore } from "@/stores/users-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useToast } from "@/components/ui/toast";
import { useCompanyStore } from "@/stores/company-store";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "@/i18n";

// Location type hierarchy
const LOCATION_HIERARCHY: Record<string, string[]> = {
  site: ["building"],
  building: ["floor"],
  floor: ["zone", "room"],
  zone: ["room"],
  room: [],
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  site: "Campus",
  building: "Building",
  floor: "Floor",
  zone: "Zone",
  room: "Room",
};

// Icon components for each location type
const LOCATION_TYPE_ICONS: Record<string, LucideIcon> = {
  site: Building2,
  building: Building,
  floor: Layers,
  zone: LayoutGrid,
  room: DoorOpen,
};

// Colors for each location type
const LOCATION_TYPE_COLORS: Record<string, string> = {
  site: "text-purple-500",
  building: "text-blue-500",
  floor: "text-emerald-500",
  zone: "text-orange-500",
  room: "text-pink-500",
};

// Helper to render location type icon with color
const LocationTypeIcon = ({ type, className, colored = true }: { type: string; className?: string; colored?: boolean }) => {
  const Icon = LOCATION_TYPE_ICONS[type] || MapPin;
  const colorClass = colored ? (LOCATION_TYPE_COLORS[type] || "text-muted-foreground") : "";
  return <Icon className={cn(colorClass, className)} />;
};

function LocationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("selected");
  
  const company = useCompanyParam();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(selectedParam);
  const [addChildParentId, setAddChildParentId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { t, formatDate, formatNumber } = useTranslation();
  const { items: locations, add: addLocation, update: updateLocation, remove: removeLocation } = useLocationsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();
  const { items: companies } = useCompanyStore();
  const companyId = (companies.find((c) => c.slug === company) || companies[0])?.id || "";

  const [newLocation, setNewLocation] = React.useState({
    name: "",
    type: "site" as "site" | "building" | "floor" | "zone" | "room",
    address: "",
    parent_id: "",
    floorCount: 1,
    zoneCount: 0,
    roomCount: 0,
  });

  const [editLocation, setEditLocation] = React.useState({
    name: "",
    address: "",
  });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Handle URL parameter for pre-selecting a location
  React.useEffect(() => {
    if (selectedParam && !selectedLocationId) {
      setSelectedLocationId(selectedParam);
      // Also expand the tree to show the selected location
      const location = locations.find(l => l.id === selectedParam);
      if (location) {
        // Build path from root to this location and expand all
        const pathToRoot: string[] = [];
        let current = location;
        while (current.parent_id) {
          pathToRoot.push(current.parent_id);
          current = locations.find(l => l.id === current.parent_id) || current;
          if (!current.parent_id) break;
        }
        setExpandedItems(new Set(pathToRoot));
      }
    }
  }, [selectedParam, selectedLocationId]);

  // Build tree structure
  const buildTree = () => {
    const roots = locations.filter(l => !l.parent_id);
    const getChildren = (parentId: string) => locations.filter(l => l.parent_id === parentId);
    return { roots, getChildren };
  };

  const { roots, getChildren } = buildTree();

  const locationTypes = [
    { value: "site", label: "Campus", description: "Top-level location" },
    { value: "building", label: "Building", description: "A building within a campus" },
    { value: "floor", label: "Floor", description: "A floor within a building" },
    { value: "zone", label: "Zone / Area", description: "An area within a floor" },
    { value: "room", label: "Room", description: "A specific room" },
  ];

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleAddLocation = () => {
    // Generate a unique ID for the new location
    const newId = `loc_new_${Date.now()}`;
    
    // Create the main location
    const mainLocation = {
      id: newId,
      company_id: companyId,
      parent_id: newLocation.parent_id || null,
      type: newLocation.type as "site" | "building" | "floor" | "zone" | "room",
      name: newLocation.name,
      address: newLocation.address || null,
      gps_lat: null,
      gps_lng: null,
      qr_code: `LOC-${newId.toUpperCase()}`,
      metadata: {},
      created_at: new Date().toISOString(),
      employee_count: 0,
      asset_count: 0,
    };
    
    // Collect all new locations to add
    const newLocations = [mainLocation];
    
    // Auto-create floors if adding a building with floorCount
    if (newLocation.type === "building" && newLocation.floorCount > 0) {
      for (let i = 1; i <= newLocation.floorCount; i++) {
        const floorId = `${newId}_f${i}`;
        newLocations.push({
          id: floorId,
          company_id: companyId,
          parent_id: newId,
          type: "floor" as const,
          name: i === 1 ? "Ground Floor" : `Floor ${i}`,
          address: null,
          gps_lat: null,
          gps_lng: null,
          qr_code: `LOC-${floorId.toUpperCase()}`,
          metadata: {},
          created_at: new Date().toISOString(),
          employee_count: 0,
          asset_count: 0,
        });
      }
    }
    
    // Auto-create zones/rooms if adding a floor
    if (newLocation.type === "floor") {
      // Create zones
      for (let i = 1; i <= newLocation.zoneCount; i++) {
        const zoneId = `${newId}_z${i}`;
        newLocations.push({
          id: zoneId,
          company_id: companyId,
          parent_id: newId,
          type: "zone" as const,
          name: `Zone ${i}`,
          address: null,
          gps_lat: null,
          gps_lng: null,
          qr_code: `LOC-${zoneId.toUpperCase()}`,
          metadata: {},
          created_at: new Date().toISOString(),
          employee_count: 0,
          asset_count: 0,
        });
      }
      
      // Create rooms
      for (let i = 1; i <= newLocation.roomCount; i++) {
        const roomId = `${newId}_r${i}`;
        newLocations.push({
          id: roomId,
          company_id: companyId,
          parent_id: newId,
          type: "room" as const,
          name: `Room ${i}`,
          address: null,
          gps_lat: null,
          gps_lng: null,
          qr_code: `LOC-${roomId.toUpperCase()}`,
          metadata: {},
          created_at: new Date().toISOString(),
          employee_count: 0,
          asset_count: 0,
        });
      }
    }
    
    // Add all new locations to state
    newLocations.forEach((loc) => addLocation(loc));
    
    // Select the new location and expand its parent
    setSelectedLocationId(newId);
    if (newLocation.parent_id) {
      setExpandedItems(prev => new Set([...prev, newLocation.parent_id]));
    }
    
    setShowAddModal(false);
    setAddChildParentId(null);
    setNewLocation({
      name: "",
      type: "site",
      address: "",
      parent_id: "",
      floorCount: 1,
      zoneCount: 0,
      roomCount: 0,
    });
    toast("Location added successfully");
  };

  // Get selected location data
  const selectedLocation = selectedLocationId 
    ? locations.find(l => l.id === selectedLocationId) 
    : null;
  
  // Get parent of selected location
  const selectedLocationParent = selectedLocation?.parent_id 
    ? locations.find(l => l.id === selectedLocation.parent_id)
    : null;

  // Get children of selected location
  const selectedLocationChildren = selectedLocation 
    ? getChildren(selectedLocation.id)
    : [];

  // Get allowed child types for selected location
  const allowedChildTypes = selectedLocation 
    ? (LOCATION_HIERARCHY[selectedLocation.type] || [])
    : [];

  // Calculate days without incident for a location (including all descendants)
  const calculateDaysWithoutIncident = (locationId: string): number => {
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
      const location = locations.find(l => l.id === locationId);
      if (location) {
        const createdDate = new Date(location.created_at);
        const today = new Date();
        return Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return 365; // Default to a year if no data
    }
    
    const incidentDate = new Date(recentIncident.incident_date);
    const today = new Date();
    return Math.floor((today.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get days without incident for selected location
  const daysWithoutIncident = selectedLocation 
    ? calculateDaysWithoutIncident(selectedLocation.id) 
    : 0;

  // Get assigned employees for selected location
  const assignedEmployees = selectedLocation 
    ? users.filter(u => u.location_id === selectedLocation.id)
    : [];

  // Get assigned assets for selected location
  const assignedAssets = selectedLocation 
    ? assets.filter(a => a.location_id === selectedLocation.id)
    : [];

  // Populate edit form when opening edit modal
  const handleOpenEditModal = () => {
    if (selectedLocation) {
      setEditLocation({
        name: selectedLocation.name,
        address: selectedLocation.address || "",
      });
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedLocationId) {
      updateLocation(selectedLocationId, {
        name: editLocation.name,
        address: editLocation.address || null,
      });
      toast("Location updated");
    }
    setShowEditModal(false);
  };
  
  // Handle delete location
  const handleDeleteLocation = () => {
    if (selectedLocationId) {
      // Get all descendant IDs to delete
      const getAllDescendantIds = (id: string): string[] => {
        const children = locations.filter(l => l.parent_id === id);
        const childIds = children.map(c => c.id);
        const descendantIds = children.flatMap(c => getAllDescendantIds(c.id));
        return [...childIds, ...descendantIds];
      };
      
      const idsToDelete = [selectedLocationId, ...getAllDescendantIds(selectedLocationId)];
      idsToDelete.forEach((id) => removeLocation(id));
      toast("Location deleted", "info");
    }
    setShowDeleteConfirm(false);
    setSelectedLocationId(null);
  };

  // Handle opening add child modal from tree
  const handleAddChild = (parentId: string) => {
    const parent = locations.find(l => l.id === parentId);
    if (parent) {
      const childTypes = LOCATION_HIERARCHY[parent.type] || [];
      if (childTypes.length > 0) {
        setAddChildParentId(parentId);
        setNewLocation({
          name: "",
          type: childTypes[0] as typeof newLocation.type,
          address: "",
          parent_id: parentId,
          floorCount: 1,
          zoneCount: 0,
          roomCount: 0,
        });
        setShowAddModal(true);
      }
    }
  };

  // Expand all ancestors of a node
  const expandToNode = (nodeId: string) => {
    const newExpanded = new Set(expandedItems);
    let current = locations.find(l => l.id === nodeId);
    while (current?.parent_id) {
      newExpanded.add(current.parent_id);
      current = locations.find(l => l.id === current!.parent_id);
    }
    setExpandedItems(newExpanded);
  };

  // Recursive tree node renderer for sidebar
  const renderTreeNode = (location: typeof locations[0], depth: number = 0) => {
    const children = getChildren(location.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(location.id);
    const isSelected = selectedLocationId === location.id;
    const canAddChildren = (LOCATION_HIERARCHY[location.type] || []).length > 0;

    return (
      <div key={location.id}>
        <div
          className={cn(
            "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
            isSelected 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-muted"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedLocationId(location.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(location.id); }}
              className={cn(
                "p-0.5 rounded hover:bg-black/10",
                isSelected && "hover:bg-white/20"
              )}
            >
              {isExpanded 
                ? <ChevronDown className="h-3.5 w-3.5" /> 
                : <ChevronRight className="h-3.5 w-3.5" />
              }
            </button>
          ) : (
            <span className="w-4" />
          )}
          <LocationTypeIcon type={location.type} className="h-4 w-4 mr-1" />
          <span className="flex-1 truncate font-medium">{location.name}</span>
          {canAddChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAddChild(location.id); }}
              className={cn(
                "opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity",
                isSelected ? "hover:bg-white/20" : "hover:bg-muted-foreground/20"
              )}
              title={`Add ${(LOCATION_HIERARCHY[location.type] || []).map(t => LOCATION_TYPE_LABELS[t]).join("/")}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>
            {children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("locations.title")}</h1>
      </div>

      {/* Tree View - File Explorer Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Left Sidebar - Tree */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("locations.locationHierarchy")}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                    // Expand all
                    const allIds = new Set(locations.map(l => l.id));
                    setExpandedItems(allIds);
                  }}
                >
                  {t("locations.expandAll")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-2">
                {roots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("locations.noLocationsYet")}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => { setAddChildParentId(null); setShowAddModal(true); }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("locations.addFirstLocation")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {roots.map(location => renderTreeNode(location))}
                    {/* Add Campus Button at bottom */}
                    <button
                      onClick={() => { 
                        setAddChildParentId(null); 
                        setNewLocation({ name: "", type: "site", address: "", parent_id: "", floorCount: 1, zoneCount: 0, roomCount: 0 });
                        setShowAddModal(true); 
                      }}
                      className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md w-full mt-2 border border-dashed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("locations.addCampus")}</span>
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Details */}
          <Card className="lg:col-span-2">
            {selectedLocation ? (
              <>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <LocationTypeIcon type={selectedLocation.type} className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{selectedLocation.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground capitalize">{selectedLocation.type}</span>
                          {selectedLocationParent && (
                            <span className="text-sm text-muted-foreground">
                              in {selectedLocationParent.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleOpenEditModal}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {allowedChildTypes.length > 0 && (
                        <Button size="sm" onClick={() => handleAddChild(selectedLocation.id)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add {allowedChildTypes.map(t => LOCATION_TYPE_LABELS[t]).join(" / ")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* QR Code - Compact */}
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="bg-white p-2 rounded-lg border">
                      <QRCodeSVG
                        id={`qr-tree-${selectedLocation.id}`}
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${company}/app/location/${selectedLocation.id}`}
                        size={80}
                        level="M"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1">{t("locations.locationQRCode")}</p>
                      <p className="text-xs text-muted-foreground mb-3 truncate font-mono">
                        /{company}/app/location/{selectedLocation.id}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/${company}/app/location/${selectedLocation.id}`);
                        }}>
                          <Copy className="h-3 w-3 mr-1" />
                          {t("locations.copy")}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                          const svg = document.getElementById(`qr-tree-${selectedLocation.id}`);
                          if (svg) {
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const img = new window.Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              ctx?.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.download = `qr-${selectedLocation.name}.png`;
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = "data:image/svg+xml;base64," + btoa(svgData);
                          }
                        }}>
                          <Download className="h-3 w-3 mr-1" />
                          {t("locations.download")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Statistics - Type-specific */}
                  <div>
                    <Label className="text-muted-foreground text-sm font-medium mb-3 block">{t("locations.statistics")}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Show type-specific child counts */}
                      {selectedLocation.type === "site" && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <Building className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                          <p className="text-lg font-bold">
                            {selectedLocationChildren.filter(c => c.type === "building").length}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("locations.buildings")}</p>
                        </div>
                      )}
                      {selectedLocation.type === "building" && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <Layers className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                          <p className="text-lg font-bold">
                            {selectedLocationChildren.filter(c => c.type === "floor").length}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("locations.floors")}</p>
                        </div>
                      )}
                      {selectedLocation.type === "floor" && (
                        <>
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <LayoutGrid className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                            <p className="text-lg font-bold">
                              {selectedLocationChildren.filter(c => c.type === "zone").length}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("locations.zones")}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <DoorOpen className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                            <p className="text-lg font-bold">
                              {selectedLocationChildren.filter(c => c.type === "room").length}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("locations.rooms")}</p>
                          </div>
                        </>
                      )}
                      {selectedLocation.type === "zone" && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <DoorOpen className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                          <p className="text-lg font-bold">
                            {selectedLocationChildren.filter(c => c.type === "room").length}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("locations.rooms")}</p>
                        </div>
                      )}
                      {/* Always show employees, assets, and days without incident */}
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{selectedLocation.employee_count}</p>
                        <p className="text-xs text-muted-foreground">{t("locations.employees")}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Wrench className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{selectedLocation.asset_count}</p>
                        <p className="text-xs text-muted-foreground">{t("locations.assets")}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Shield className="h-4 w-4 mx-auto mb-1 text-green-500" />
                        <p className="text-lg font-bold">{daysWithoutIncident}</p>
                        <p className="text-xs text-muted-foreground">{t("locations.daysSafe")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sub-locations */}
                  {selectedLocationChildren.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-sm font-medium mb-3 block">
                        {t("locations.subLocations")}
                      </Label>
                      <div className="grid gap-2">
                        {selectedLocationChildren.slice(0, 4).map(child => (
                          <button
                            key={child.id}
                            onClick={() => { 
                              setSelectedLocationId(child.id);
                              expandToNode(child.id);
                            }}
                            className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                          >
                            <LocationTypeIcon type={child.type} className="h-4 w-4" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{child.name}</p>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">{child.type}</Badge>
                          </button>
                        ))}
                        {selectedLocationChildren.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{selectedLocationChildren.length - 4} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assigned Employees */}
                  {assignedEmployees.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-sm font-medium mb-3 block">
                        {t("locations.assignedEmployees", { count: assignedEmployees.length })}
                      </Label>
                      <div className="grid gap-2">
                        {assignedEmployees.slice(0, 3).map(employee => (
                          <div
                            key={employee.id}
                            className="flex items-center gap-3 p-2 rounded-lg border text-left"
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {employee.first_name[0]}{employee.last_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{employee.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{employee.job_title || employee.role}</p>
                            </div>
                          </div>
                        ))}
                        {assignedEmployees.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{assignedEmployees.length - 3} more employees
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assigned Assets */}
                  {assignedAssets.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-sm font-medium mb-3 block">
                        {t("locations.assignedAssets", { count: assignedAssets.length })}
                      </Label>
                      <div className="grid gap-2">
                        {assignedAssets.slice(0, 3).map(asset => (
                          <div
                            key={asset.id}
                            className="flex items-center gap-3 p-2 rounded-lg border text-left"
                          >
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{asset.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{asset.asset_tag}</p>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">{asset.condition}</Badge>
                          </div>
                        ))}
                        {assignedAssets.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{assignedAssets.length - 3} more assets
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Danger Zone - Compact */}
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("locations.deleteLocation")}
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <FolderTree className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">{t("locations.selectLocation")}</p>
                <p className="text-sm">{t("locations.selectLocationDesc")}</p>
              </div>
            )}
          </Card>
        </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddModal(false); setAddChildParentId(null); }}>
          <div className="relative z-50 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {addChildParentId 
                    ? `Add ${LOCATION_TYPE_LABELS[newLocation.type] || "Location"}` 
                    : "Add New Campus"
                  }
                </h2>
                {addChildParentId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Under: {locations.find(l => l.id === addChildParentId)?.name}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddModal(false); setAddChildParentId(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("locations.locationName")} *</Label>
                <Input
                  id="name"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder={`e.g., ${LOCATION_TYPE_LABELS[newLocation.type]} A`}
                  className="mt-1"
                />
              </div>

              {/* Show type selector only if adding to a specific parent (child location) */}
              {addChildParentId ? (
                <div>
                  <Label>{t("locations.locationType")} *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(LOCATION_HIERARCHY[locations.find(l => l.id === addChildParentId)?.type || ""] || []).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewLocation({ ...newLocation, type: type as typeof newLocation.type })}
                        className={cn(
                          "rounded-lg border-2 p-3 text-left transition-all",
                          newLocation.type === type
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <p className="font-medium text-sm flex items-center gap-2">
                          <LocationTypeIcon type={type} className="h-4 w-4" />
                          {LOCATION_TYPE_LABELS[type]}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // When adding at root level (Campus), just show selected type as info
                <div>
                  <Label>{t("locations.locationType")}</Label>
                  <div className="mt-2 flex items-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/5">
                    <LocationTypeIcon type="site" className="h-5 w-5" />
                    <span className="font-medium">{LOCATION_TYPE_LABELS.site}</span>
                  </div>
                </div>
              )}

              {/* Show floor count only when adding a building */}
              {newLocation.type === "building" && (
                <div>
                  <Label htmlFor="floorCount">{t("locations.numberOfFloors")} *</Label>
                  <Input
                    id="floorCount"
                    type="number"
                    min="1"
                    max="200"
                    value={newLocation.floorCount}
                    onChange={(e) => setNewLocation({ ...newLocation, floorCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {newLocation.floorCount} floor{newLocation.floorCount !== 1 ? "s" : ""} will be created automatically
                  </p>
                </div>
              )}

              {/* Show zone/room count when adding a floor */}
              {newLocation.type === "floor" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zoneCount">{t("locations.numberOfZones")}</Label>
                    <Input
                      id="zoneCount"
                      type="number"
                      min="0"
                      max="100"
                      value={newLocation.zoneCount}
                      onChange={(e) => setNewLocation({ ...newLocation, zoneCount: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("locations.optional")}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="roomCount">{t("locations.numberOfRooms")}</Label>
                    <Input
                      id="roomCount"
                      type="number"
                      min="0"
                      max="100"
                      value={newLocation.roomCount}
                      onChange={(e) => setNewLocation({ ...newLocation, roomCount: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("locations.optional")}
                    </p>
                  </div>
                </div>
              )}

              {/* Show parent selector only if not adding to a specific parent and not a site */}
              {!addChildParentId && newLocation.type !== "site" && (
                <div>
                  <Label htmlFor="parent">{t("locations.parentLocation")}</Label>
                  <select
                    id="parent"
                    title="Select parent location"
                    aria-label="Select parent location"
                    value={newLocation.parent_id}
                    onChange={(e) => setNewLocation({ ...newLocation, parent_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t("locations.selectParentLocation")}</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label htmlFor="address">{t("locations.addressOptional")}</Label>
                <textarea
                  id="address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  placeholder={"Street Address\nCity, State/Province ZIP/Postal Code\nCountry"}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("locations.addressFormats")}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddModal(false); setAddChildParentId(null); }}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1" onClick={handleAddLocation} disabled={!newLocation.name}>
                <Plus className="h-4 w-4 mr-1" />
                Add {LOCATION_TYPE_LABELS[newLocation.type]}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEditModal(false)}>
          <div className="relative z-50 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Edit {LOCATION_TYPE_LABELS[selectedLocation.type]}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedLocation.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_name">{t("locations.name")} *</Label>
                <Input
                  id="edit_name"
                  value={editLocation.name}
                  onChange={(e) => setEditLocation({ ...editLocation, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit_address">{t("locations.address")}</Label>
                <textarea
                  id="edit_address"
                  value={editLocation.address}
                  onChange={(e) => setEditLocation({ ...editLocation, address: e.target.value })}
                  placeholder={"Street Address\nCity, State/Province ZIP/Postal Code\nCountry"}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={!editLocation.name}>
                {t("locations.saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("locations.deleteLocation")}</h2>
                <p className="text-sm text-muted-foreground">{t("locations.cannotBeUndone")}</p>
              </div>
            </div>
            
            <p className="text-sm mb-4">
              Are you sure you want to delete <strong>{selectedLocation.name}</strong>?
              {selectedLocationChildren.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete {selectedLocationChildren.length} sub-location(s).
                </span>
              )}
            </p>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteLocation}>
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <LocationsPageContent />
    </React.Suspense>
  );
}
