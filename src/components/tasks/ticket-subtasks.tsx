"use client";

import React from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TicketTask = { id: string; title: string; completed: boolean };

function getStorageKey(ticketId: string) {
  return `harmoniq_ticket_tasks_${ticketId}`;
}

const DEFAULT_TASKS: TicketTask[] = [
  { id: "t1", title: "Review incident report", completed: true },
  { id: "t2", title: "Contact witness", completed: true },
  { id: "t3", title: "Order replacement parts", completed: false },
  { id: "t4", title: "Schedule follow-up inspection", completed: false },
];

function loadTasks(ticketId: string): TicketTask[] {
  if (typeof window === "undefined") return DEFAULT_TASKS;
  try {
    const raw = window.localStorage.getItem(getStorageKey(ticketId));
    return raw ? JSON.parse(raw) : DEFAULT_TASKS;
  } catch {
    return DEFAULT_TASKS;
  }
}

function saveTasks(ticketId: string, tasks: TicketTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(ticketId), JSON.stringify(tasks));
}

interface TicketSubtasksProps {
  ticketId: string;
}

export function TicketSubtasks({ ticketId }: TicketSubtasksProps) {
  const [tasks, setTasks] = React.useState<TicketTask[]>([]);
  const [newTask, setNewTask] = React.useState("");

  React.useEffect(() => {
    setTasks(loadTasks(ticketId));
  }, [ticketId]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleToggle = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    setTasks(updated);
    saveTasks(ticketId, updated);
  };

  const handleAdd = () => {
    if (!newTask.trim()) return;
    const task: TicketTask = {
      id: `st_${Date.now()}`,
      title: newTask.trim(),
      completed: false,
    };
    const updated = [...tasks, task];
    setTasks(updated);
    saveTasks(ticketId, updated);
    setNewTask("");
  };

  const handleDelete = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    saveTasks(ticketId, updated);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      {tasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progress</p>
              <p className="text-xs text-muted-foreground">{completedCount}/{tasks.length} completed</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add new */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a subtask..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button size="icon" onClick={handleAdd} disabled={!newTask.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task list */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Subtasks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                <button
                  onClick={() => handleToggle(task.id)}
                  className={cn(
                    "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    task.completed
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30 hover:border-primary",
                  )}
                >
                  {task.completed && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
