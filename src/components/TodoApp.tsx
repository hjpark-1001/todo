"use client";

import { useEffect, useMemo, useState } from "react";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "active" | "done";

interface TodoItem {
  id: string;
  title: string;
  tag: string;
  priority: Priority;
  due: string;
  done: boolean;
  createdAt: number;
}

const STORAGE_KEY = "todo-app-items-v1";
const THEME_KEY = "todo-app-theme";

const priorityLabel: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const priorityBadgeClass: Record<Priority, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
  medium: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  low: "bg-green-500/10 text-green-600 dark:text-green-400",
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function TodoApp() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [isDark, setIsDark] = useState(false);

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");

  useEffect(() => {
    // One-time load from localStorage on mount; must run in an effect (not a
    // lazy useState initializer) so the static-export server render and the
    // client's first render both start from [] and avoid a hydration mismatch.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(raw));
      } catch {
        // ignore corrupt storage
      }
    }
    setIsDark(document.documentElement.classList.contains("dark"));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        title: trimmed,
        tag: tag.trim(),
        priority,
        due,
        done: false,
        createdAt: Date.now(),
      },
    ]);
    setTitle("");
    setTag("");
    setPriority("medium");
    setDue("");
  }

  function toggleDone(id: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const tags = useMemo(
    () => [...new Set(items.map((i) => i.tag).filter(Boolean))].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const today = todayStr();
    return items
      .filter((i) => {
        if (filter === "active" && i.done) return false;
        if (filter === "done" && !i.done) return false;
        if (tagFilter && i.tag !== tagFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.priority !== b.priority)
          return priorityRank[a.priority] - priorityRank[b.priority];
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return b.createdAt - a.createdAt;
      })
      .map((i) => ({ ...i, overdue: !!i.due && i.due < today && !i.done }));
  }, [items, filter, tagFilter]);

  const total = items.length;
  const done = items.filter((i) => i.done).length;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-xl relative">
        <button
          onClick={toggleTheme}
          className="absolute -top-8 right-0 sm:top-0 sm:-right-2 text-xs font-medium bg-white dark:bg-zinc-900 shadow-sm rounded-full px-3 py-1.5 text-zinc-600 dark:text-zinc-300"
        >
          {isDark ? "☀️ 라이트모드" : "🌙 다크모드"}
        </button>

        <h1 className="text-2xl font-bold mb-5 mt-8 sm:mt-0">할 일</h1>

        <form
          onSubmit={addItem}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-5 mb-4 flex flex-col gap-2.5"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
              maxLength={200}
              required
              className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="shrink-0 bg-blue-500 hover:opacity-90 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              추가
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="카테고리/태그 (예: 업무, 개인)"
              maxLength={30}
              className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:border-blue-500"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:border-blue-500"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:border-blue-500"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {(["all", "active", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full shadow-sm ${
                filter === f
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {f === "all" ? "전체" : f === "active" ? "진행중" : "완료"}
            </button>
          ))}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="ml-auto text-xs bg-white dark:bg-zinc-900 shadow-sm rounded-full px-3 py-1.5 text-zinc-600 dark:text-zinc-300 outline-none"
          >
            <option value="">모든 태그</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-sm text-zinc-400 py-10">
            할 일이 없습니다
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className={`bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-3.5 flex items-start gap-3 ${
                  item.done ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() => toggleDone(item.id)}
                  className={`shrink-0 mt-0.5 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-xs ${
                    item.done
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {item.done ? "✓" : ""}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium break-words ${
                      item.done ? "line-through" : ""
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${priorityBadgeClass[item.priority]}`}
                    >
                      {priorityLabel[item.priority]}
                    </span>
                    {item.tag && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400">
                        {item.tag}
                      </span>
                    )}
                    {item.due && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.overdue
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {item.overdue ? "지연 " : "마감 "}
                        {item.due}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="shrink-0 text-zinc-400 hover:text-red-500 text-lg px-1"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {total > 0 && (
          <div className="flex justify-between text-xs text-zinc-400 mt-4 px-1">
            <span>
              전체 {total}개 · 완료 {done}개 · 남음 {total - done}개
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
