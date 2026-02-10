"use client";

import * as React from "react";
import { useRouter, useParams, notFound } from "next/navigation";
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
import { useTicketsStore } from "@/stores/tickets-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export default function TicketDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const ticketId = routeParams.ticketId as string;
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("info");
  const [newComment, setNewComment] = React.useState("");
  const [newTask, setNewTask] = React.useState("");

  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const { items: tickets, update: updateTicket, remove: removeTicket } = useTicketsStore();
  const ticket = tickets.find((t) => t.id === ticketId);

  // Ticket not found — trigger Next.js not-found boundary
  if (!ticket) {
    notFound();
  }

  const [editedDescription, setEditedDescription] = React.useState("");

  React.useEffect(() => {
    if (ticket) setEditedDescription(ticket.description);
  }, [ticket?.id]);

  // Mock tasks
  const [tasks, setTasks] = React.useState([
    { id: "t1", title: "Review incident report", completed: true },
    { id: "t2", title: "Contact witness", completed: true },
    { id: "t3", title: "Order replacement parts", completed: false },
    { id: "t4", title: "Schedule follow-up inspection", completed: false },
  ]);

  // Mock comments
  const [comments, setComments] = React.useState([
    { id: "c1", author: "John Doe", text: "Started investigation", date: "2024-01-28 09:30", avatar: "JD" },
    { id: "c2", author: "Jane Smith", text: "Parts ordered, ETA 3 days", date: "2024-01-28 14:15", avatar: "JS" },
    { id: "c3", author: "Mike Johnson", text: "Confirmed with supplier - delivery on track", date: "2024-01-29 10:00", avatar: "MJ" },
  ]);

  // Mock documents
  const documents = [
    { id: "d1", name: "Incident Report.pdf", size: "245 KB", uploaded: "2024-01-28", by: "John Doe" },
    { id: "d2", name: "Photos.zip", size: "4.2 MB", uploaded: "2024-01-28", by: "Jane Smith" },
  ];

  const tabs: Tab[] = [
    { id: "info", label: "Details", icon: Info },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "comments", label: "Comments", icon: MessageSquare, count: comments.length },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "settings", label: "Settings", icon: Trash2, variant: "danger" },
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

  if (!ticket) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }


  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
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
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("tickets.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.status")}</Label>
                    <p className="font-medium capitalize">{ticket.status.replace("_", " ")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.priority")}</Label>
                    <p className="font-medium capitalize">{ticket.priority}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("tickets.labels.assignee")}</Label>
                    <p className="font-medium">{ticket.assigned_to || "Unassigned"}</p>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tasks completed</span>
                      <span className="font-medium">{completedTasks}/{tasks.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${taskProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{taskProgress}% complete</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
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
                  placeholder="Add a new task..."
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
                    placeholder="Add a comment..."
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
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button className="gap-2">
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
                              {doc.size} • Uploaded by {doc.by} on {doc.uploaded}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
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

        {/* Settings Tab (Danger Zone) */}
        {activeTab === "settings" && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Close Ticket</p>
                  <p className="text-sm text-muted-foreground">
                    Mark this ticket as closed. It can be reopened later if needed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!ticket) return;
                    updateTicket(ticket.id, {
                      status: "closed",
                      updated_at: new Date().toISOString(),
                    });
                    toast("Ticket closed");
                  }}
                >
                  Close Ticket
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4 bg-destructive/5">
                <div>
                  <p className="font-medium text-destructive">Delete Ticket</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this ticket and all associated data.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    if (!ticket) return;
                    removeTicket(ticket.id);
                    toast("Ticket deleted", "info");
                    router.push(`/${company}/dashboard/tickets`);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
