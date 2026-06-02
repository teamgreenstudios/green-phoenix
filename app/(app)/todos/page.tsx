import { createClient } from "@/lib/supabase/server";
import type { Todo } from "@/lib/types";
import { TodoList } from "@/components/todos/todo-list";

export default async function TodosPage() {
  const supabase = await createClient();
  // Global todos = project_id is null. RLS scopes to the signed-in user.
  const { data } = await supabase
    .from("todos")
    .select("*")
    .is("project_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Todo[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Todos</h1>
        <p className="text-sm text-muted-foreground">
          Your global todo list. Per-project todos live on each project.
        </p>
      </div>
      <TodoList scope="global" projectId={null} initialTodos={data ?? []} />
    </div>
  );
}
