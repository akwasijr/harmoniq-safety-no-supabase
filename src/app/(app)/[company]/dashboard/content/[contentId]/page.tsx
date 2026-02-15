"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Image,
  BarChart3,
  Settings,
  Info,
  Plus,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useContentStore } from "@/stores/content-store";
import { useUsersStore } from "@/stores/users-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

const tabs: Tab[] = [
  { id: "details", label: "Details", icon: Info },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "media", label: "Media", icon: Image },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings, variant: "danger" },
];

export default function ContentDetailPage() {
  const { t, formatDate } = useTranslation();
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const contentId = routeParams.contentId as string;
  const [activeTab, setActiveTab] = React.useState("details");
  const [isEditing, setIsEditing] = React.useState(false);

  const { toast } = useToast();
  const { items: contentItems, isLoading, update: updateContent, remove: removeContent } = useContentStore();
  const { items: users } = useUsersStore();
  const content = contentItems.find((c) => c.id === contentId);
  const author = content?.created_by ? users.find((u) => u.id === content.created_by) : undefined;

  const [formData, setFormData] = React.useState({
    title: content?.title || "",
    content: content?.content || "",
    category: content?.category || "",
    status: content?.status || "draft",
  });

  React.useEffect(() => {
    if (content) {
      setFormData({
        title: content.title,
        content: content.content || "",
        category: content.category || "",
        status: content.status,
      });
    }
  }, [content]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!content) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const analyticsData = {
    views: 1234,
    uniqueViews: 892,
    avgReadTime: "3m 24s",
    shares: 23,
    downloads: 45,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/content`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{content.title}</h1>
              <span className="text-sm text-muted-foreground capitalize">{content.status}</span>
              <span className="text-sm text-muted-foreground capitalize">{content.type}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(content.created_at)} • {author?.full_name || "Unknown author"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (!content) return;
              const nextStatus = content.status === "published" ? "draft" : "published";
              updateContent(content.id, {
                status: nextStatus,
                published_at: nextStatus === "published" ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              });
              toast(nextStatus === "published" ? "Content published" : "Content unpublished");
            }}
          >
            {content.status === "published" ? (
              <><EyeOff className="h-4 w-4" /> Unpublish</>
            ) : (
              <><Eye className="h-4 w-4" /> Publish</>
            )}
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t("common.cancel")}</Button>
              <Button
                className="gap-2"
                onClick={() => {
                  if (!content) return;
                  updateContent(content.id, {
                    title: formData.title,
                    content: formData.content,
                    category: formData.category || null,
                    status: formData.status as typeof content.status,
                    updated_at: new Date().toISOString(),
                  });
                  toast("Content updated");
                  setIsEditing(false);
                }}
              >
                <Save className="h-4 w-4" /> {t("common.save")}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>{t("common.edit")}</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content">Body</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={12}
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">{content.title}</h2>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <p>{content.content}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{content.type}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    {isEditing ? (
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 h-8"
                      />
                    ) : (
                      <p className="font-medium">{content.category || "—"}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(content.created_at)}</p>
                  </div>
                </div>
                {content.published_at && (
                  <div className="flex items-start gap-3">
                    <Eye className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Published</p>
                      <p className="font-medium">{formatDate(content.published_at)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Author</p>
                    <p className="font-medium">{author?.full_name || "Unknown"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Views</span>
                  <span className="font-medium">{analyticsData.views}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Read Time</span>
                  <span className="font-medium">{analyticsData.avgReadTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Downloads</span>
                  <span className="font-medium">{analyticsData.downloads}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground capitalize">{content.type}</span>
                {content.category && <span className="text-sm text-muted-foreground">{content.category}</span>}
              </div>
              <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span>{author?.full_name || "Unknown"}</span>
                <span>•</span>
                <span>{content.published_at ? formatDate(content.published_at) : t("content.statuses.draft")}</span>
              </div>
              <div className="h-48 rounded-lg bg-muted flex items-center justify-center mb-6">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="prose prose-lg max-w-none">
                <p>{content.content}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "media" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Media & Attachments</CardTitle>
            <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" /> Upload</Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                <div className="text-center">
                  <Image className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Featured Image</p>
                  <p className="text-xs text-muted-foreground">Click to upload</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Attachment.pdf</p>
                  <p className="text-xs text-muted-foreground">2.3 MB • Uploaded yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-semibold">{analyticsData.views}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Unique Views</p>
                <p className="text-2xl font-semibold">{analyticsData.uniqueViews}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Shares</p>
                <p className="text-2xl font-semibold">{analyticsData.shares}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Downloads</p>
                <p className="text-2xl font-semibold">{analyticsData.downloads}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12" />
                <p className="ml-4">No analytics data available yet.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label>Visibility</Label>
                <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="all">All Employees</option>
                  <option value="managers">Managers Only</option>
                  <option value="specific">Specific Departments</option>
                </select>
              </div>
              <div>
                <Label>Schedule Publishing</Label>
                <Input type="datetime-local" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Archive Content</p>
                  <p className="text-sm text-muted-foreground">Move to archive (can be restored)</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!content) return;
                    updateContent(content.id, {
                      status: "draft",
                      published_at: null,
                      updated_at: new Date().toISOString(),
                    });
                    toast("Content archived");
                  }}
                >
                  Archive
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Content</p>
                  <p className="text-sm text-muted-foreground">Permanently delete this content</p>
                </div>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    if (!content) return;
                    removeContent(content.id);
                    toast("Content deleted", "info");
                    router.push(`/${company}/dashboard/content`);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> {t("common.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
