import { useEffect, useState, type FormEvent } from "react";
import { CheckSquare, Plus, ListTodo, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/ui/PageHeader";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Field, TextInput, SelectInput, TextArea } from "../components/ui/FormField";

interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
}

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const priorityStyles: Record<string, string> = {
  low: "bg-surface text-text-secondary",
  medium: "bg-accent-subtle text-accent",
  high: "bg-warning/10 text-warning",
  urgent: "bg-danger/10 text-danger",
};

export default function TasksPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<TaskRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", priority: "medium", status: "todo", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50);
    setTasks((data ?? []) as TaskRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [companyId]);

  const set =
    (key: keyof typeof form) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ title: "", description: "", priority: "medium", status: "todo", due_date: "" });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: TaskRecord) => {
    setEditingItem(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "todo",
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    const { error: delError } = await supabase.from("tasks").delete().eq("id", deletingItem.id);
    setDeleting(false);
    if (delError) {
      setError("Failed to delete task");
      return;
    }
    setDeletingItem(null);
    await loadTasks();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.title.trim()) {
      setError("Task title is required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      company_id: companyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    };

    let req;
    if (editingItem) {
      req = await supabase.from("tasks").update(payload).eq("id", editingItem.id);
    } else {
      req = await supabase.from("tasks").insert(payload);
    }

    setSaving(false);
    if (req.error) {
      setError("We couldn't save that task — please try again.");
      return;
    }
    setModalOpen(false);
    setEditingItem(null);
    setForm({ title: "", description: "", priority: "medium", status: "todo", due_date: "" });
    await loadTasks();
  };

  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks & Projects"
        subtitle="Manage your operational tasks"
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
            New Task
          </Button>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard padding="md">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Open</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{counts.todo + counts.in_progress}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-bold text-accent mt-1">{counts.in_progress}</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-success mt-1">{counts.done}</p>
        </GlassCard>
      </div>

      {/* Task list */}
      {loading ? (
        <GlassCard padding="lg">
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        </GlassCard>
      ) : tasks.length === 0 ? (
        <GlassCard padding="lg">
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <CheckSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs mt-1">Click "New Task" to create your first one</p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard padding="lg">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <ListTodo size={16} className="text-accent" />
            All Tasks
          </h3>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-surface/50 hover:bg-surface-hover/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      task.status === "done" ? "bg-success" : task.status === "in_progress" ? "bg-accent" : "bg-text-muted"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium text-text-primary truncate ${task.status === "done" ? "line-through opacity-50" : ""}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-text-muted truncate mt-0.5">{task.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted hidden sm:block">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${priorityStyles[task.priority] ?? ""}`}>
                    {task.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-xs text-text-secondary">
                    {statusLabels[task.status] ?? task.status}
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                      title="Edit task"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingItem(task)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* New / Edit task modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Task" : "New Task"}
        description={editingItem ? "Update task details and progress" : "Create a task for you or your team"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => {
              setModalOpen(false);
              setEditingItem(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" form="add-task-form" loading={saving}>
              {saving ? "Saving…" : editingItem ? "Update Task" : "Create Task"}
            </Button>
          </>
        }
      >
        <form id="add-task-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Task title" htmlFor="task-title">
            <TextInput
              id="task-title"
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Reorder coffee beans"
              required
            />
          </Field>
          <Field label="Description" htmlFor="task-desc">
            <TextArea
              id="task-desc"
              value={form.description}
              onChange={set("description")}
              placeholder="What needs to be done?"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Priority" htmlFor="task-priority">
              <SelectInput id="task-priority" value={form.priority} onChange={set("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status" htmlFor="task-status">
              <SelectInput id="task-status" value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Due date" htmlFor="task-due">
              <TextInput
                id="task-due"
                type="date"
                value={form.due_date}
                onChange={set("due_date")}
              />
            </Field>
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleDelete} loading={deleting} className="!bg-danger !text-white hover:!bg-danger/80">
              {deleting ? "Deleting…" : "Delete Task"}
            </Button>
          </>
        }
      >
        {deletingItem && (
          <div className="p-3 rounded-xl bg-surface/50 text-sm space-y-1">
            <p className="text-text-primary font-medium">{deletingItem.title}</p>
            <p className="text-xs text-text-muted">Status: {statusLabels[deletingItem.status] || deletingItem.status}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}