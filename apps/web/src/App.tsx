import { useEffect, useState } from 'react';
import { AIErrorResponseSchema } from '@family-hub/schemas/src/ai-error';
import type { AiPromptRequest } from '@family-hub/schemas/src/ai-request';
import { AiPromptRequestSchema } from '@family-hub/schemas/src/ai-request';
import type { GenerateTextRequest } from '@family-hub/schemas/src/ai-gateway';
import { GenerateTextRequestSchema, GenerateTextResponseSchema } from '@family-hub/schemas/src/ai-gateway';
import { apiFetch } from './api';
import { clearAccessToken, getAccessToken, handleOidcCallback, loginWithOidc } from './oidc';

const defaultPrompt: AiPromptRequest = {
  prompt: '',
  intent: 'recipe',
};

const intentLabels: Record<AiPromptRequest['intent'], string> = {
  recipe: '菜谱分析',
  knowledge: '知识库查询',
  travel: '旅行计划',
  health: '健康建议',
};

export default function App() {
  const [promptForm, setPromptForm] = useState<AiPromptRequest>(defaultPrompt);
  const [errors, setErrors] = useState<Partial<Record<keyof AiPromptRequest, string>>>({});
  const [submitted, setSubmitted] = useState<AiPromptRequest | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'anonymous' | 'error'>(
    'loading',
  );
  const [authError, setAuthError] = useState<string | null>(null);

  const handleChange = <Key extends keyof AiPromptRequest>(field: Key, value: AiPromptRequest[Key]) => {
    setPromptForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = AiPromptRequestSchema.safeParse(promptForm);
    if (!result.success) {
      const nextErrors: Partial<Record<keyof AiPromptRequest, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AiPromptRequest | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitted(result.data);
    setAiResponse(null);
    setAiError(null);

    const requestPayload: GenerateTextRequest = {
      messages: [
        {
          role: 'system',
          content: `你是家庭助手，当前场景：${intentLabels[result.data.intent]}`,
        },
        {
          role: 'user',
          content: result.data.prompt,
        },
      ],
      temperature: 0.4,
    };

    const payloadCheck = GenerateTextRequestSchema.safeParse(requestPayload);
    if (!payloadCheck.success) {
      setAiError('请求格式不合法，请稍后重试。');
      return;
    }

    try {
      const response = await apiFetch('/v1/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCheck.data),
      });

      const data = await response.json();
      if (!response.ok) {
        const parsedError = AIErrorResponseSchema.safeParse(data);
        setAiError(parsedError.success ? parsedError.data.error.message : '请求失败');
        return;
      }

      const parsed = GenerateTextResponseSchema.safeParse(data);
      if (!parsed.success) {
        setAiError('响应解析失败，请稍后重试。');
        return;
      }

      setAiResponse(parsed.data.content);
      setPromptForm(defaultPrompt);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '网络异常');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await handleOidcCallback();
        setAuthError(null);
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'OIDC 登录失败');
      } finally {
        setAuthStatus(getAccessToken() ? 'authenticated' : 'anonymous');
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return;
    }

    void apiFetch('/health').catch(() => {
      // background probe only; UI handled elsewhere
    });
  }, [authStatus]);

  const handleLogin = async () => {
    try {
      await loginWithOidc();
    } catch (error) {
      setAuthStatus('error');
      setAuthError(error instanceof Error ? error.message : 'OIDC 配置缺失');
    }
  };

  const handleLogout = () => {
    clearAccessToken();
    setAuthStatus('anonymous');
  };

  return (
    <div className="min-h-screen text-[color:var(--fg)]">
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="absolute -left-12 top-24 hidden h-44 w-44 rounded-full bg-emerald-200/40 blur-3xl md:block" />
        <div className="absolute -right-10 top-12 hidden h-48 w-48 rounded-full bg-amber-200/50 blur-3xl md:block" />

        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-700">
              family-hub
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              家庭健康中枢
              <span className="block font-[family:var(--font-serif)] text-3xl font-medium text-emerald-700 md:text-4xl">
                生活数据的仪表盘
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[color:var(--muted)] md:text-base">
              健康记录、菜谱、旅行计划与知识库统一进入一张可视化面板。云端/本地模式可切换，
              保持家庭数据的可控性与可追踪性。
            </p>
          </div>

          <div className="grid w-full gap-3 rounded-2xl border border-black/10 bg-white/70 p-4 md:w-[280px]">
            <div className="text-xs uppercase tracking-[0.24em] text-emerald-700">
              System Status
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[color:var(--muted)]">今日活跃成员</span>
              <span className="text-lg font-semibold text-emerald-700">3</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['AI Gateway', 'API', 'Worker'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                >
                  {item} OK
                </span>
              ))}
            </div>
          </div>
        </header>

        <main className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="fade-up rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_12px_30px_-24px_rgba(16,24,16,0.6)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">健康仪表盘</h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                    活跃
                  </span>
                </div>
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  体脂、睡眠、心率与训练负荷统一追踪，自动生成趋势卡片。
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                  {[
                    { label: '睡眠', value: '7h 20m' },
                    { label: '心率', value: '64 bpm' },
                    { label: '训练', value: '2 / 4' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-emerald-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">
                        {item.label}
                      </div>
                      <div className="mt-1 text-base font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fade-up-delay grid-pattern relative overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-6">
                <div className="float-slow absolute right-4 top-6 h-14 w-14 rounded-full bg-amber-300/60" />
                <h2 className="text-base font-semibold">下一步任务</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  待处理的家庭事项、菜谱和旅行清单统一追踪。
                </p>
                <div className="mt-5 space-y-3 text-sm">
                  {[
                    '录入本周体重与体脂',
                    '生成低糖早餐清单',
                    '整理春节旅行装备',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">旅行与知识计划</h2>
                <span className="text-xs text-[color:var(--muted)]">本周更新</span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: '家庭周末路线',
                    desc: '城市公园 + 轻徒步 + 地图收藏。',
                    tone: 'bg-blue-50 text-blue-700',
                  },
                  {
                    title: '菜谱采集',
                    desc: '支持链接/拍照解析并自动标注热量。',
                    tone: 'bg-amber-50 text-amber-700',
                  },
                  {
                    title: '知识库',
                    desc: '家庭共享笔记 + AI 自动归档。',
                    tone: 'bg-emerald-50 text-emerald-700',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs ${item.tone}`}>
                      规划中
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="grid gap-6">
            <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
              <h2 className="text-base font-semibold">家庭身份</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                使用 OIDC 连接家庭私有身份系统。
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--muted)]">状态</span>
                  <span className="text-sm font-semibold">
                    {authStatus === 'authenticated'
                      ? '已连接'
                      : authStatus === 'loading'
                        ? '检查中'
                        : '未连接'}
                  </span>
                </div>
                {authError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {authError}
                  </div>
                ) : null}
                {authStatus === 'authenticated' ? (
                  <button
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700"
                    type="button"
                    onClick={handleLogout}
                  >
                    退出
                  </button>
                ) : (
                  <button
                    className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                    type="button"
                    onClick={handleLogin}
                  >
                    连接账号
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
              <h2 className="text-base font-semibold">AI 运行概览</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                云端/本地模型切换与健康状态监控。
              </p>
              <div className="mt-6 space-y-4 text-sm">
                {[
                  { label: '模式', value: 'Cloud', color: 'text-emerald-700' },
                  { label: '模型', value: 'Text + Vision', color: 'text-blue-700' },
                  { label: '请求队列', value: '0 pending', color: 'text-amber-700' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[color:var(--muted)]">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                className="mt-6 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_20px_-12px_rgba(15,118,110,0.8)]"
                type="button"
              >
                进入 AI 控制台
              </button>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
              <h2 className="text-base font-semibold">AI 快速请求</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                使用共享 Schema 校验输入，确保前后端类型一致。
              </p>
              <form className="mt-4 space-y-3 text-sm" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-emerald-700" htmlFor="intent">
                    场景
                  </label>
                  <select
                    id="intent"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
                    value={promptForm.intent}
                    onChange={(event) =>
                      handleChange('intent', event.target.value as AiPromptRequest['intent'])
                    }
                  >
                    {Object.entries(intentLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-emerald-700" htmlFor="prompt">
                    提示内容
                  </label>
                  <textarea
                    id="prompt"
                    className="min-h-[110px] w-full rounded-xl border border-black/10 bg-white px-3 py-2"
                    placeholder="例如：分析这周菜谱并标注蛋白质含量。"
                    value={promptForm.prompt}
                    onChange={(event) => handleChange('prompt', event.target.value)}
                  />
                  {errors.prompt ? (
                    <div className="text-xs text-amber-700">{errors.prompt}</div>
                  ) : null}
                </div>
                <button
                  className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                  type="submit"
                >
                  发送请求
                </button>
              </form>
              {submitted ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">
                  已提交：{intentLabels[submitted.intent]} · {submitted.prompt.slice(0, 40)}
                  {submitted.prompt.length > 40 ? '…' : ''}
                </div>
              ) : null}
              {aiResponse ? (
                <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-black/10 bg-white px-3 py-3 text-xs text-[color:var(--fg)]">
                  {aiResponse}
                </div>
              ) : null}
              {aiError ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700">
                  {aiError}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
              <h2 className="text-base font-semibold">今日提醒</h2>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  { title: '睡眠补偿', note: '建议今晚提早 30 分钟就寝。' },
                  { title: '运动记录', note: '本周还差 1 次训练打卡。' },
                  { title: '饮水提醒', note: '下午 2 点补水 300ml。' },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/5 bg-amber-50/50 px-3 py-3">
                    <div className="text-xs uppercase tracking-wide text-amber-700">
                      {item.title}
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>

        <footer className="mt-12 text-xs text-[color:var(--muted)]">
          Constitution-driven development. One-step-per-command.
        </footer>
      </div>
    </div>
  );
}
