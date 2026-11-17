"use client";

import { useState, useId } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Calendar, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { formatDate, daysFromNow, initials } from "@/lib/utils";
import { TaskDialog, type TaskItem } from "./task-dialog";
import { moveTask } from "./actions";
import type { TaskStatus } from "@/generated/prisma/enums";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "IN_REVIEW", label: "In review" },
  { id: "DONE", label: "Done" },
];

type BoardUser = {
  id: string;
  name: string;
  email: string;
};

type BoardMilestone = {
  id: string;
  title: string;
};

type BoardProps = {
  projectId: string;
  initialTasks: TaskItem[];
  currentUser: {
    id: string;
    role: string;
  };
  canManage: boolean;
  members: BoardUser[];
  milestones: BoardMilestone[];
};

// ─── Individual Draggable Card ───

function TaskCard({
  task,
  isDraggable,
  onClick,
}: {
  task: TaskItem;
  isDraggable: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { task },
      disabled: !isDraggable,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isDone = task.status === "DONE";
  const daysLeft = task.dueDate ? daysFromNow(task.dueDate) : null;
  const isOverdue = !isDone && daysLeft !== null && daysLeft < 0;
  const isDueSoon = !isDone && daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      onClick={onClick}
      className={`rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-shadow hover:border-slate-300 hover:shadow-sm select-none ${
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">
          {task.title}
        </h4>
        <StatusBadge value={task.priority} className="shrink-0" />
      </div>

      {task.milestone && (
        <p className="mt-1.5 text-xs text-slate-400 truncate">
          {task.milestone.title}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <span
              className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700"
              title={task.assignee.name}
            >
              {initials(task.assignee.name)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400">
              <User className="size-3" /> Unassigned
            </span>
          )}
          {task.assignee && (
            <span className="truncate max-w-[80px]">{task.assignee.name}</span>
          )}
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <span
            className={`flex items-center gap-1 ${
              isOverdue
                ? "font-semibold text-red-600"
                : isDueSoon
                  ? "font-medium text-amber-700"
                  : "text-slate-400"
            }`}
          >
            <Calendar className="size-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  columnTasks,
  canManage,
  currentUserId,
  onCreate,
  onEdit,
}: {
  column: (typeof COLUMNS)[number];
  columnTasks: TaskItem[];
  canManage: boolean;
  currentUserId: string;
  onCreate: () => void;
  onEdit: (task: TaskItem) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl bg-slate-50/80 p-3 border border-slate-200/80 min-w-[260px] ${
        isOver ? "border-brand-400 bg-brand-50/50" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            {column.label}
          </h3>
          <span className="flex size-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
            {columnTasks.length}
          </span>
        </div>

        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreate}
            className="size-7 p-0 text-slate-400 hover:text-slate-700"
            title={`Add task to ${column.label}`}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* Sortable Task List */}
      <SortableContext
        items={columnTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2.5 min-h-[150px]">
          {columnTasks.map((task) => {
            const isDraggable = canManage || task.assigneeId === currentUserId;
            return (
              <TaskCard
                key={task.id}
                task={task}
                isDraggable={isDraggable}
                onClick={() => onEdit(task)}
              />
            );
          })}
          {columnTasks.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Main Board ───

export function KanbanBoard({
  projectId,
  initialTasks,
  currentUser,
  canManage,
  members,
  milestones,
}: BoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dndContextId = useId();

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState<TaskItem[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("TODO");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state during render when props change (React recommended pattern)
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Group tasks by column status
  const tasksByColumn: Record<TaskStatus, TaskItem[]> = {
    TODO: tasks.filter((t) => t.status === "TODO").sort((a, b) => a.position - b.position),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").sort((a, b) => a.position - b.position),
    IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").sort((a, b) => a.position - b.position),
    DONE: tasks.filter((t) => t.status === "DONE").sort((a, b) => a.position - b.position),
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    // Check if user is allowed to move this task
    const isDraggable = canManage || task.assigneeId === currentUser.id;
    if (!isDraggable) return;

    // Determine target column and position
    let targetStatus: TaskStatus = task.status;
    let targetPosition = 0;

    const isColumn = COLUMNS.some((col) => col.id === overId);
    if (isColumn) {
      targetStatus = overId as TaskStatus;
      targetPosition = tasksByColumn[targetStatus].length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        const columnTasks = tasksByColumn[targetStatus];
        const overIndex = columnTasks.findIndex((t) => t.id === overId);
        targetPosition = overIndex >= 0 ? overIndex : columnTasks.length;
      }
    }

    // Save previous state for rollback
    const prevTasks = [...tasks];

    // Optimistically update local tasks
    if (task.status === targetStatus) {
      const columnTasks = tasksByColumn[targetStatus];
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = isColumn ? columnTasks.length - 1 : columnTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        setTasks((prev) =>
          prev.map((t) => {
            const idx = reordered.findIndex((r) => r.id === t.id);
            if (idx !== -1) {
              return { ...t, position: idx };
            }
            return t;
          }),
        );
      }
    } else {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === activeId) {
            return {
              ...t,
              status: targetStatus,
              position: targetPosition,
            };
          }
          return t;
        }),
      );
    }

    // Call server action
    const res = await moveTask({
      taskId: activeId,
      projectId,
      status: targetStatus,
      position: targetPosition,
    });

    if (res?.error) {
      setTasks(prevTasks);
      setErrorMessage(res.error);
    } else {
      setErrorMessage(null);
    }
  };

  // ─── Toolbar filter change handler ───
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="size-4" /> {errorMessage}
          </span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Assignee Filter */}
          <div className="w-40">
            <Select
              defaultValue={searchParams.get("assignee") ?? ""}
              onChange={(e) => handleFilterChange("assignee", e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">All assignees</option>
              <option value="me">Assigned to me</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="w-36">
            <Select
              defaultValue={searchParams.get("priority") ?? ""}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </div>

          {/* Milestone Filter */}
          <div className="w-40">
            <Select
              defaultValue={searchParams.get("milestone") ?? ""}
              onChange={(e) => handleFilterChange("milestone", e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">All milestones</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setCreateStatus("TODO");
              setIsCreateOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden /> New task
          </Button>
        )}
      </div>

      {/* Kanban Columns */}
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByColumn[column.id];
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                columnTasks={columnTasks}
                canManage={canManage}
                currentUserId={currentUser.id}
                onCreate={() => {
                  setCreateStatus(column.id);
                  setIsCreateOpen(true);
                }}
                onEdit={setEditingTask}
              />
            );
          })}
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-lg border border-brand-300 bg-white p-3.5 shadow-lg select-none rotate-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-slate-900 line-clamp-2">
                  {activeTask.title}
                </h4>
                <StatusBadge value={activeTask.priority} className="shrink-0" />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog: Create */}
      {isCreateOpen && (
        <TaskDialog
          projectId={projectId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          defaultStatus={createStatus}
          canManage={canManage}
          isAssignee={false}
          assigneeOptions={members}
          milestoneOptions={milestones}
        />
      )}

      {/* Task Dialog: Edit */}
      {editingTask && (
        <TaskDialog
          projectId={projectId}
          isOpen={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          canManage={canManage}
          isAssignee={editingTask.assigneeId === currentUser.id}
          assigneeOptions={members}
          milestoneOptions={milestones}
        />
      )}
    </div>
  );
}
