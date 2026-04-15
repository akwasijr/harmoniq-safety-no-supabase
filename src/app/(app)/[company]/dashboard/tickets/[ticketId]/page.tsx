"use client";

import * as React from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import { LoadingPage } from "@/components/ui/loading";

type TicketTask = { id: string; title: string; completed: boolean };
type TicketComment = { id: string; author: string; text: string; date: string; avatar: string };
const defaultTasksData: TicketTask[] = [];
const defaultCommentsData: TicketComment[] = [];

import {
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  MessageSquare,
  CheckSquare,
  Plus,
  Edit,
  Info,
  FileText,
  Link as LinkIcon,
  Calendar,
  Upload,
  Eye,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useCompanyData } from "@/hooks/use-company-data";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/role-guard";
import { storeFile, getFilesForEntity } from "@/lib/file-storage";
import type { StoredFile } from "@/lib/file-storage";

export default function TicketDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const ticketId = routeParams.ticketId as string;
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("info");
  const [newComment, setNewComment] = React.useState("");
  const [newTask, setNewTask] = React.useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const { hasPermission, user } = useAuth();
  const canDeleteTicket = hasPermission("tickets.delete");
  const { tickets, users, stores } = useCompanyData();
  const { isLoading, update: updateTicket, remove: removeTicket } = stores.tickets;
  const ticket = tickets.find((t) => t.id === ticketId);
  const assignee = ticket?.assigned_to ? users.find((u) => u.id === ticket.assigned_to) : undefined;

  const [editedDescription, setEditedDescription] = React.useState("");
  const [documents, setDocuments] = React.useState<StoredFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ticket) setEditedDescription(ticket.description);
  }, [ticket?.id]);

  React.useEffect(() => {
    if (ticketId) {
      setDocuments(getFilesForEntity("ticket", ticketId));
    }
  }, [ticketId]);

  type TicketTask = { id: string; title: string; completed: boolean };
  const TASKS_KEY = `harmoniq_${company}_ticket_tasks_${ticketId}`;
  const defaultTasks = defaultTasksData;
  const [tasks, setTasks] = React.useState<TicketTask[]>(() => {
    if (typeof window === "undefined") return defaultTasks;
    try {
      const stored = window.localStorage.getItem(TASKS_KEY);
      return stored ? JSON.parse(stored) : defaultTasks;
    } catch (err) {
      console.warn("Failed to read ticket tasks from localStorage:", err);
      return defaultTasks;
    }
  });

  type TicketComment = { id: string; author: string; text: string; date: string; avatar: string };
  const COMMENTS_KEY = `harmoniq_${company}_ticket_comments_${ticketId}`;
  const defaultComments = defaultCommentsData;
  const [comments, setComments] = React.useState<TicketComment[]>(() => {
    if (typeof window === "undefined") return defaultComments;
    try {
      const stored = window.localStorage.getItem(COMMENTS_KEY);
      return stored ? JSON.parse(stored) : defaultComments;
    } catch (err) {
      console.warn("Failed to read ticket comments from localStorage:", err);
      return defaultComments;
    }
  });

  // Persist comments to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    } catch (err) {
      console.warn("Failed to write ticket comments to localStorage:", err);
    }
  }, [comments, COMMENTS_KEY]);

  // Persist tasks to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn("Failed to write ticket tasks to localStorage:", err);
    }
  }, [tasks, TASKS_KEY]);

  if (isLoading && tickets.length === 0) {
    return <LoadingPage />;
  }

  // Ticket not found. Trigger Next.js not-found boundary
  if (!ticket) {
    notFound();
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;
    try {
      const stored = await storeFile(file, "ticket", ticket.id, user?.id || "");
      setDocuments((prev) => [...prev, stored]);
      toast("File uploaded", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    }
    e.target.value = "";
  };

  const tabs: Tab[] = [
    { id: "info", label: "Details", icon: Info },
    { id: "comments", label: "Comments", icon: MessageSquare, count: comments.length },
  ];

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { id: `t${Date.now()}`, title: newTask, completed: false }]);
      setNewTask("");
    }
  };

  const handleDeleteTicket = () => {
    if (!ticket) return;
    removeTicket(ticket.id);
    toast("Ticket deleted", "info");
    setShowDeleteConfirm(false);
    router.push(`/${company}/dashboard/tickets`);
  };


  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <RoleGuard requiredPermission="tickets.view_own">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{ticket.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground capitalize">{ticket.status.replace("_", " ")}</span>
            <span className="text-sm text-muted-foreground capitalize">{ticket.priority}</span>
            {ticket.due_date && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("tickets.labels.dueDate")}: {formatDate(new Date(ticket.due_date))}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === "info" && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="gap-2">
                <Edit className="h-4 w-4" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              {isEditing && (
                <Button
                  className="gap-2"
                  onClick={() => {
                    if (!ticket) return;
                    updateTicket(ticket.id, {
                      description: editedDescription,
                      updated_at: new Date().toISOString(),
                    });
                    setIsEditing(false);
                    toast("Ticket updated");
                  }}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Details Tab */}
        {activeTab === "info" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("tickets.labels.description")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <p className="text-muted-foreground">{ticket.description}</p>
                  )}
                </CardContent>
              </Card>

              {/* Linked Incident */}
              {ticket.incident_ids && ticket.incident_ids.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      {t("tickets.labels.relatedIncident")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <div className="flex-1">
                        <p className="font-medium">Incident #{ticket.incident_ids[0]}</p>
                        <p className="text-sm text-muted-foreground">Click to view details</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/${company}/dashboard/incidents/${ticket.incident_ids[0]}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.status")}</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium capitalize"
                      value={ticket.status}
                      onChange={(e) => {
                        updateTicket(ticket.id, {
                          status: e.target.value as typeof ticket.status,
                          updated_at: new Date().toISOString(),
                        });
                        toast("Status updated");
                      }}
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.priority")}</Label>
                    <p className="font-medium capitalize">{ticket.priority}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.assignee")}</Label>
                    <p className="font-medium">{assignee?.full_name || "Unassigned"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.dueDate")}</Label>
                    <p className="font-medium">
                      {ticket.due_date ? formatDate(new Date(ticket.due_date)) : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">
                      {formatDate(new Date(ticket.created_at))}
                    </p>
                  </div>
                  {tasks.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Sub-tasks</Label>
                      <div className="mt-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{completedTasks}/{tasks.length} done</span>
                          <span>{taskProgress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${taskProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "info" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Tasks ({completedTasks}/{tasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new task */}
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder={t("tickets.placeholders.addTask")}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
                <Button onClick={addTask} disabled={!newTask.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Task list */}
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        task.completed 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground hover:border-primary"
                      }`}
                    >
                      {task.completed && <CheckSquare className="h-3 w-3" />}
                    </button>
                    <span className={cn(
                      "flex-1",
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comments ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {comment.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">{comment.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                  </div>
                </div>
              ))}
              
              {/* Add comment */}
              <div className="flex gap-3 pt-4 border-t">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  You
                </div>
                <div className="flex-1">
                  <Textarea
                    placeholder={t("tickets.placeholders.addComment")}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={!newComment.trim()}
                    onClick={() => {
                      const now = new Date();
                      setComments([
                        ...comments,
                        {
                          id: `c${Date.now()}`,
                          author: "You",
                          text: newComment,
                          date: formatDate(now, { dateStyle: "medium", timeStyle: "short" }),
                          avatar: "YU",
                        },
                      ]);
                      setNewComment("");
                    }}
                  >
                    {t("common.submit")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Tab */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No documents attached</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(doc.size / 1024).toFixed(0)} KB • Uploaded {formatDate(new Date(doc.uploadedAt))}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.dataUrl, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
