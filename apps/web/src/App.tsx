export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">family-hub</h1>
            <p className="mt-2 text-sm text-slate-400">
              健康记录 · 菜谱 · 旅行攻略 · 知识库（一期云端，二期本地）
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
            web v0.1
          </div>
        </header>

        <main className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
            <h2 className="text-base font-medium">下一步模块</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• 身体维度仪表盘（曲线 + 动效）</li>
              <li>• 菜谱采集（链接/拍照解析 + 热量）</li>
              <li>• 旅行攻略（平台文本解析 + 清单）</li>
              <li>• 知识库（笔记 + 向量检索）</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
            <h2 className="text-base font-medium">API 连接（占位）</h2>
            <p className="mt-4 text-sm text-slate-400">
              后续会在这里接入 <code className="rounded bg-slate-800 px-1">VITE_API_BASE_URL</code>，
              并实现健康状态展示与模块导航。
            </p>
          </section>
        </main>

        <footer className="mt-10 text-xs text-slate-500">
          Constitution-driven development. One-step-per-command.
        </footer>
      </div>
    </div>
  );
}
