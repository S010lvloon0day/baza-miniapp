import Icon from './Icon'
import { useMemo, useState, useEffect } from 'react'

/**
 * HackLab — обучающая лаборатория уязвимостей (CTF). ВСЁ выполняется в браузере
 * учащегося против СИМУЛИРОВАННЫХ целей: ни один запрос не идёт на наш сервер,
 * сессия/куки реального приложения недоступны. XSS исполняется в изолированном
 * <iframe sandbox="allow-scripts"> (null-origin). Цель — захватить флаг и отправить его.
 * Формат ```hacklab: { "type":"sqli_login"|..., "title", "goal", "flag", "hint", ...данные }
 */

// ---- SQL WHERE интерпретатор (для sqli_login) ----
function sqlStripComments(s: string) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '-' && s[i + 1] === '-') break
    if (s[i] === '#') break
    out += s[i]
  }
  return out
}
function sqlTokenize(s: string) {
  const toks: any[] = []; let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    if (c === "'") { let j = i + 1, v = ''; while (j < s.length && s[j] !== "'") { v += s[j]; j++ } toks.push({ t: 'str', v }); i = j + 1; continue }
    if (c === '(' || c === ')') { toks.push({ t: c }); i++; continue }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue }
    if (c === '!' && s[i + 1] === '=') { toks.push({ t: 'op', v: '!=' }); i += 2; continue }
    if (c === '<' && s[i + 1] === '>') { toks.push({ t: 'op', v: '!=' }); i += 2; continue }
    let j = i, w = ''
    while (j < s.length && /[A-Za-z0-9_.]/.test(s[j])) { w += s[j]; j++ }
    if (w === '') { i++; continue }
    const up = w.toUpperCase()
    if (up === 'AND' || up === 'OR') toks.push({ t: 'logic', v: up })
    else if (/^[0-9]+$/.test(w)) toks.push({ t: 'num', v: w })
    else toks.push({ t: 'ident', v: w })
    i = j
  }
  return toks
}
function sqlEval(toks: any[], scope: Record<string, any>): boolean {
  let pos = 0
  const peek = () => toks[pos]; const next = () => toks[pos++]
  function valExpr(): any {
    const tk = peek(); if (!tk) return { v: '' }
    if (tk.t === '(') { next(); const e = orE(); if (peek() && peek().t === ')') next(); return e }
    if (tk.t === 'str') { next(); return { v: tk.v, isStr: true } }
    if (tk.t === 'num') { next(); return { v: tk.v, isNum: true } }
    if (tk.t === 'ident') { next(); const k = tk.v.toLowerCase(); if (k in scope) return { v: String(scope[k]), isStr: true }; return { v: tk.v } }
    next(); return { v: '' }
  }
  function cmp(): any {
    const left = valExpr(); const tk = peek()
    if (tk && tk.t === 'op') { next(); const right = valExpr(); const eq = String(left.v) === String(right.v); return { b: tk.v === '=' ? eq : !eq } }
    if ('b' in left) return left
    if (left.isNum) return { b: left.v !== '0' }
    if (left.isStr) return { b: left.v !== '' }
    return { b: false }
  }
  const toB = (x: any) => ('b' in x ? x.b : Boolean(x.v))
  function andE(): any { let v = cmp(); while (peek() && peek().t === 'logic' && peek().v === 'AND') { next(); const r = cmp(); v = { b: toB(v) && toB(r) } } return v }
  function orE(): any { let v = andE(); while (peek() && peek().t === 'logic' && peek().v === 'OR') { next(); const r = andE(); v = { b: toB(v) || toB(r) } } return v }
  return toB(orE())
}
function sqliLogin(users: any[], u: string, p: string) {
  const whereRaw = "username='" + u + "' AND password='" + p + "'"
  const query = 'SELECT * FROM users WHERE ' + whereRaw
  const toks = sqlTokenize(sqlStripComments(whereRaw))
  const rows = users.filter(x => sqlEval(toks, { username: x.user, password: x.pass }))
  return { rows, query }
}
function sqliUnionSearch(articles: any[], secretRows: any[], cols: number, q: string) {
  const query = "SELECT id, title FROM articles WHERE title LIKE '%" + q + "%'"
  const low = q.toLowerCase()
  const visible = articles.filter(a => a.title.toLowerCase().includes(low) && !low.includes('union'))
  const m = low.match(/union\s+select\s+(.+?)\s+from\s+users/)
  if (!m) return { query, rows: visible.map(a => [a.id, a.title]), error: null as string | null, leaked: false }
  const n = m[1].split(',').length
  if (n !== cols) return { query, rows: null, error: 'The used SELECT statements have a different number of columns', leaked: false }
  const leaked = secretRows.map(r => cols === 2 ? [r.a, r.b] : [r.a])
  return { query, rows: visible.map(a => [a.id, a.title]).concat(leaked), error: null, leaked: true }
}
function cmdInjection(host: string, fs: Record<string, string>) {
  const base = 'PING ' + (host.split(/[;|&`$]/)[0].trim() || 'host') + ': 56 data bytes\n64 bytes: icmp_seq=0 time=0.1 ms'
  const m = host.match(/(?:;|\|\||\||&&|`|\$\()\s*(.+?)(?:`|\)|$)/)
  if (!m) return { out: base, injected: false, flag: null as string | null }
  const cmd = m[1].trim(); let extra = ''; let flag: string | null = null
  const catM = cmd.match(/^cat\s+(\S+)/)
  if (catM) { const f = catM[1].replace(/^\.\//, ''); if (fs[f] !== undefined) { extra = fs[f]; const fm = fs[f].match(/FLAG\{[^}]*\}/); if (fm) flag = fm[0] } else extra = 'cat: ' + catM[1] + ': No such file or directory' }
  else if (/^ls/.test(cmd)) extra = Object.keys(fs).join('  ')
  else extra = 'sh: ' + cmd.split(' ')[0] + ': command simulated'
  return { out: base + '\n' + extra, injected: true, flag }
}
function pathTraversal(path: string, fs: Record<string, string>) {
  const norm = path.replace(/^\/+/, '')
  if (fs[norm] !== undefined) { const c = fs[norm]; const fm = c.match(/FLAG\{[^}]*\}/); return { content: c, flag: fm ? fm[0] : null, found: true } }
  return { content: 'Error: file not found in webroot', flag: null, found: false }
}
function b64urlDecode(s: string) { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(s))) } catch { return '' } }
function jwtVerifyVuln(token: string, flag: string) {
  const parts = token.split('.'); if (parts.length < 2) return { ok: false, reason: 'некорректный токен' }
  let header: any, payload: any
  try { header = JSON.parse(b64urlDecode(parts[0])); payload = JSON.parse(b64urlDecode(parts[1])) } catch { return { ok: false, reason: 'не удалось раскодировать base64/JSON' } }
  const algNone = String(header.alg || '').toLowerCase() === 'none'
  if (payload.role === 'admin' && algNone) return { ok: true, reason: '', flag }
  if (payload.role === 'admin' && !algNone) return { ok: false, reason: 'подпись неверна — попробуй alg:none' }
  return { ok: false, reason: 'ты не admin' }
}

function noSqli(users: any[], bodyStr: string) {
  let body: any
  try { body = JSON.parse(bodyStr) } catch { return { ok: false, who: null, err: 'не JSON' } }
  const isOp = (v: any) => v && typeof v === 'object' && Object.keys(v).some(k => k.startsWith('$'))
  const match = users.filter(u => (isOp(body.user) ? true : u.user === body.user) && (isOp(body.pass) ? true : u.pass === body.pass))
  return { ok: match.length > 0, who: match[0] ? match[0].user : null, err: null }
}
function ssti(input: string, flag: string) {
  const m = input.match(/\{\{(.+?)\}\}/)
  if (!m) return { out: input, flag: null as string | null, confirmed: false }
  const expr = m[1].trim()
  if (/config|flag|__class__|__globals__|self\.|request\./i.test(expr)) return { out: flag, flag, confirmed: true }
  const am = expr.match(/^(\d+)\s*\*\s*(\d+)$/)
  if (am) return { out: input.replace(/\{\{.+?\}\}/, String(Number(am[1]) * Number(am[2]))), flag: null, confirmed: true }
  const sm = expr.match(/^(\d+)\s*\+\s*(\d+)$/)
  if (sm) return { out: input.replace(/\{\{.+?\}\}/, String(Number(sm[1]) + Number(sm[2]))), flag: null, confirmed: true }
  return { out: input.replace(/\{\{.+?\}\}/, ''), flag: null, confirmed: true }
}
function ssrf(url: string, secret: string) {
  const low = (url || '').toLowerCase()
  if (/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|169\.254\.169\.254|metadata|intranet|internal|192\.168\.|10\.0\.)/.test(low)) {
    const fm = secret.match(/FLAG\{[^}]*\}/); return { out: secret, flag: fm ? fm[0] : null, internal: true }
  }
  return { out: 'Ответ от внешнего хоста (200 OK) — ничего интересного.', flag: null as string | null, internal: false }
}
function xxe(xml: string, fileContent: string) {
  const hasEntity = /<!ENTITY\s+(\w+)\s+SYSTEM\s+["']file:\/\/[^"']+["']\s*>/i.test(xml)
  const ref = /&(\w+);/.test(xml)
  if (hasEntity && ref) { const fm = fileContent.match(/FLAG\{[^}]*\}/); return { out: fileContent, flag: fm ? fm[0] : null, exploited: true } }
  return { out: 'XML обработан. Внешние сущности не сработали.', flag: null as string | null, exploited: false }
}
function bruteLogin(accepted: any[], user: string, pass: string) {
  const hit = accepted.find((a: any) => a.user === user && a.pass === pass)
  return { ok: !!hit, flag: hit ? (hit.flag || null) : null }
}

type Lab = any

export default function HackLab({ content, onSolve }: { content: string; onSolve?: () => void }) {
  const lab = useMemo<Lab>(() => { try { return JSON.parse(content) } catch { return { type: 'bad' } } }, [content])
  const [submitted, setSubmitted] = useState('')
  const [solved, setSolved] = useState(false)
  const [revealed, setRevealed] = useState('')
  const [showHint, setShowHint] = useState(false)

  const flag: string = lab.flag || ''
  useEffect(() => { if (solved) onSolve?.() }, [solved])
  const checkFlag = () => setSolved(submitted.trim() === flag)

  return (
    <div className="my-4 rounded-[18px] overflow-hidden border border-white/[.08] bg-[#060B09]">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[.07] bg-s1">
        <span className="w-7 h-7 rounded-[9px] bg-[#FF6B6B]/15 text-[#FF8A8A] grid place-items-center shrink-0"><Icon name="shield" size={15} accent="#FF8A8A" /></span>
        <span className="font-display font-semibold text-[13.5px] text-fg shrink-0">Лаборатория</span>
        <span className="text-[12px] text-gray2 truncate">{lab.title || 'взлом'}</span>
        <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[.06] text-gray shrink-0">песочница</span>
      </div>
      {lab.goal && (
        <div className="px-3.5 py-2.5 text-[13.5px] leading-[1.5] text-fg/85 border-b border-white/[.06]">
          <b className="text-gold font-semibold">Цель:</b> {lab.goal}
        </div>
      )}

      <div className="p-3.5">
        <LabBody lab={lab} onReveal={(f: string) => setRevealed(f)} />
      </div>

      {revealed && (
        <div className="mx-3 mb-2.5 p-3 rounded-[12px] text-[13px] bg-green/[.10] border border-green/30 text-greenLight flex gap-2">
          <Icon name="flag" size={16} className="shrink-0 mt-0.5" />
          <span>Цель скомпрометирована. Флаг: <b className="font-mono">{revealed}</b> — вставьте его в поле ниже.</span>
        </div>
      )}

      <div className="px-3 pb-3 pt-2.5 border-t border-white/[.07] bg-s1/60">
        <div className="text-[12.5px] text-gray mb-2">Отправить флаг</div>
        <div className="flex gap-2">
          <input value={submitted} onChange={e => setSubmitted(e.target.value)} placeholder="FLAG{...}"
            className="flex-1 min-w-0 h-10 px-3 rounded-[11px] text-[13px] font-mono text-fg outline-none bg-white/[.05] border border-white/[.10] placeholder:text-gray2 focus:border-green/60" />
          <button onClick={checkFlag} className="h-10 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13.5px] active:opacity-85">
            Сдать
          </button>
          {lab.hint && (
            <button onClick={() => setShowHint(h => !h)} aria-label="Подсказка" className={`w-10 h-10 rounded-[11px] grid place-items-center ${showHint ? 'bg-purple text-white' : 'bg-white/[.07] text-violet'}`}>
              <Icon name={showHint ? 'close' : 'question'} size={17} accent="current" />
            </button>
          )}
        </div>
        {showHint && lab.hint && <div className="mt-2.5 p-3 rounded-[12px] bg-purple/[.10] border border-purple/25 text-[13px] text-fg/85 leading-[1.55]">{lab.hint}</div>}
        {solved && <div className="mt-2.5 p-3 rounded-[12px] bg-green/[.10] border border-green/30 text-[13px] text-green font-semibold flex items-center gap-2"><Icon name="checkCircle" size={17} accent="current" />Лаборатория пройдена, флаг верный</div>}
        {!solved && submitted && submitted.trim() !== flag && submitted.trim().length > 3 && (
          <div className="mt-2.5 p-3 rounded-[12px] bg-[#FF6B6B]/[.10] border border-[#FF6B6B]/30 text-[13px] text-[#FF9A9A] flex items-center gap-2"><Icon name="warnCircle" size={17} accent="current" />Неверный флаг. Проэксплуатируйте цель и получите настоящий.</div>
        )}
      </div>
    </div>
  )
}

const inp = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)', color: '#F2F4F3', borderRadius: 11 } as const
const btn = { background: 'rgba(255,255,255,.08)', color: '#F2F4F3', borderRadius: 11 } as const
const mono = 'font-mono text-[12.5px]'

function LabBody({ lab, onReveal }: { lab: Lab; onReveal: (f: string) => void }) {
  switch (lab.type) {
    case 'sqli_login': return <SqliLogin lab={lab} onReveal={onReveal} />
    case 'sqli_union': return <SqliUnion lab={lab} onReveal={onReveal} />
    case 'xss': return <XssLab lab={lab} onReveal={onReveal} />
    case 'idor': return <IdorLab lab={lab} onReveal={onReveal} />
    case 'authbypass': return <AuthBypass lab={lab} onReveal={onReveal} />
    case 'cmdi': return <CmdiLab lab={lab} onReveal={onReveal} />
    case 'path': return <PathLab lab={lab} onReveal={onReveal} />
    case 'jwt': return <JwtLab lab={lab} onReveal={onReveal} />
    case 'recon': return <ReconLab lab={lab} onReveal={onReveal} />
    case 'nosqli': return <NoSqliLab lab={lab} onReveal={onReveal} />
    case 'ssti': return <SstiLab lab={lab} onReveal={onReveal} />
    case 'ssrf': return <SsrfLab lab={lab} onReveal={onReveal} />
    case 'xxe': return <XxeLab lab={lab} onReveal={onReveal} />
    case 'brute': return <BruteLab lab={lab} onReveal={onReveal} />
    default: return <div className="text-gray text-[13px]">Неизвестный тип лаборатории.</div>
  }
}

function SqliLogin({ lab, onReveal }: any) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [msg, setMsg] = useState<any>(null)
  const go = () => {
    const r = sqliLogin(lab.users || [], u, p)
    if (r.rows.length > 0) { const who = r.rows[0].user; onReveal(lab.flag); setMsg({ ok: true, who, q: r.query }) }
    else setMsg({ ok: false, q: r.query })
  }
  return (
    <div>
      <div className="rounded-[14px] p-3.5 mb-2 bg-s1 border border-white/[.07]">
        <div className="text-[13px] text-gray mb-2">Форма входа (уязвимое приложение)</div>
        <input value={u} onChange={e => setU(e.target.value)} placeholder="логин" className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
        <input value={p} onChange={e => setP(e.target.value)} placeholder="пароль" className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
        <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Войти</button>
      </div>
      {msg && (
        <div className={`${mono} p-2.5 rounded-lg`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9aa' }}>
          <div className="text-white/40">SQL: <span className="text-amber-300">{msg.q}</span></div>
          {msg.ok ? <div className="text-green-400 mt-1">✓ Вход выполнен как <b>{msg.who}</b>!</div> : <div className="text-red-400 mt-1">✗ Неверный логин или пароль.</div>}
        </div>
      )}
    </div>
  )
}

function SqliUnion({ lab, onReveal }: any) {
  const [q, setQ] = useState(''); const [res, setRes] = useState<any>(null)
  const go = () => {
    const r = sqliUnionSearch(lab.articles || [], lab.secretRows || [], lab.cols || 2, q)
    if (r.leaked) { const f = JSON.stringify(r.rows).match(/FLAG\{[^}]*\}/); if (f) onReveal(f[0]) }
    setRes(r)
  }
  return (
    <div>
      <div className="rounded-[14px] p-3.5 mb-2 bg-s1 border border-white/[.07]">
        <div className="text-[13px] text-gray mb-2">Поиск статей</div>
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="поиск по названию" className={`flex-1 px-2.5 py-2 ${mono}`} style={inp} />
          <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Искать</button>
        </div>
      </div>
      {res && (
        <div className={`${mono} p-2.5 rounded-lg`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9aa' }}>
          <div className="text-white/40 mb-1">SQL: <span className="text-amber-300">{res.query}</span></div>
          {res.error ? <div className="text-red-400">⚠ MySQL error: {res.error}</div> :
            <table className="w-full"><tbody>{res.rows.map((row: any[], i: number) => (
              <tr key={i} className={res.leaked && i >= (lab.articles || []).length ? 'text-green-400' : 'text-white/80'}>
                {row.map((cell, j) => <td key={j} className="pr-3 py-0.5 break-all">{String(cell)}</td>)}
              </tr>
            ))}</tbody></table>}
        </div>
      )}
    </div>
  )
}

function XssLab({ lab, onReveal }: any) {
  const [payload, setPayload] = useState('')
  const [srcdoc, setSrcdoc] = useState('')
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (typeof e.data === 'string' && e.data === lab.flag) onReveal(lab.flag) }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [lab.flag, onReveal])
  const render = () => {
    const doc = '<!doctype html><html><body style="font-family:sans-serif;color:#222;padding:8px">'
      + '<script>window.__FLAG__=' + JSON.stringify(lab.flag) + ';<\/script>'
      + '<h4>' + (lab.pageTitle || 'Гостевая книга') + '</h4>'
      + '<div>Последний комментарий: ' + payload + '</div>'
      + '</body></html>'
    setSrcdoc(doc)
  }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Поле комментария отражается на странице без экранирования. Внедри скрипт, который отправит <code className="text-amber-300">window.__FLAG__</code> родителю: <code className="text-amber-300">parent.postMessage(window.__FLAG__,'*')</code></div>
      <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={2} placeholder='&lt;img src=x onerror="..."&gt;'
        className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
      <button onClick={render} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px] mb-2">Отправить комментарий</button>
      {srcdoc && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.1)' }}>
          <iframe title="vuln" sandbox="allow-scripts" srcDoc={srcdoc} style={{ width: '100%', height: 140, background: '#fff', border: 0 }} />
        </div>
      )}
    </div>
  )
}

function IdorLab({ lab, onReveal }: any) {
  const [id, setId] = useState(String(lab.yourId || ''))
  const [rec, setRec] = useState<any>(null)
  const go = () => {
    const r = (lab.records || {})[id]
    setRec(r === undefined ? null : r)
    if (r && /FLAG\{[^}]*\}/.test(JSON.stringify(r))) { const f = JSON.stringify(r).match(/FLAG\{[^}]*\}/); if (f) onReveal(f[0]) }
  }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Страница аккаунта: <code className="text-amber-300">/account?id={id || '???'}</code>. Твой ID — <b>{lab.yourId}</b>. Попробуй чужой.</div>
      <div className="flex gap-2 mb-2">
        <input value={id} onChange={e => setId(e.target.value)} className={`w-36 px-2.5 py-2 ${mono}`} style={inp} />
        <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Открыть</button>
      </div>
      {rec !== null && (<pre className={`${mono} p-2.5 rounded-lg whitespace-pre-wrap`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>{rec ? JSON.stringify(rec, null, 2) : 'Аккаунт не найден (404)'}</pre>)}
    </div>
  )
}

function AuthBypass({ lab, onReveal }: any) {
  const [cookie, setCookie] = useState(String(lab.cookieValue || 'guest'))
  const [out, setOut] = useState<any>(null)
  const open = () => {
    if (cookie.trim() === String(lab.adminValue)) { onReveal(lab.flag); setOut({ ok: true }) }
    else setOut({ ok: false })
  }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Доступ к <code className="text-amber-300">/admin</code> проверяется по cookie <code className="text-amber-300">{lab.cookieName || 'role'}</code>. Измени её значение.</div>
      <div className="flex gap-2 mb-2 items-center">
        <span className={`${mono} text-white/50`}>{lab.cookieName || 'role'}=</span>
        <input value={cookie} onChange={e => setCookie(e.target.value)} className={`w-40 px-2.5 py-2 ${mono}`} style={inp} />
        <button onClick={open} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Открыть /admin</button>
      </div>
      {out && (out.ok
        ? <pre className={`${mono} p-2.5 rounded-lg`} style={{ background: '#0d0f13', border: '1px solid rgba(40,200,64,.3)', color: '#6effa0' }}>{lab.adminPage || 'Admin panel'}\n{lab.flag}</pre>
        : <div className={`${mono} p-2.5 rounded-lg`} style={{ background: '#0d0f13', border: '1px solid rgba(255,80,80,.3)', color: '#ff9a9a' }}>403 Forbidden — только для администраторов</div>)}
    </div>
  )
}

function CmdiLab({ lab, onReveal }: any) {
  const [host, setHost] = useState(''); const [out, setOut] = useState('')
  const go = () => { const r = cmdInjection(host, lab.fs || {}); setOut(r.out); if (r.flag) onReveal(r.flag) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Утилита проверки хоста выполняет <code className="text-amber-300">ping -c1 &lt;host&gt;</code> без фильтрации ввода.</div>
      <div className="flex gap-2 mb-2">
        <input value={host} onChange={e => setHost(e.target.value)} placeholder="127.0.0.1" className={`flex-1 px-2.5 py-2 ${mono}`} style={inp} />
        <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Ping</button>
      </div>
      {out && <pre className={`${mono} p-2.5 rounded-lg whitespace-pre-wrap`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>{out}</pre>}
    </div>
  )
}

function PathLab({ lab, onReveal }: any) {
  const [file, setFile] = useState(String(lab.defaultFile || '')); const [out, setOut] = useState('')
  const go = () => { const r = pathTraversal(file, lab.fs || {}); setOut(r.content); if (r.flag) onReveal(r.flag) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Просмотр файла: <code className="text-amber-300">/download?file={file || '...'}</code>. Выберись за пределы папки.</div>
      <div className="flex gap-2 mb-2">
        <input value={file} onChange={e => setFile(e.target.value)} className={`flex-1 px-2.5 py-2 ${mono}`} style={inp} />
        <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Открыть</button>
      </div>
      {out && <pre className={`${mono} p-2.5 rounded-lg whitespace-pre-wrap`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>{out}</pre>}
    </div>
  )
}

function JwtLab({ lab, onReveal }: any) {
  const [token, setToken] = useState(String(lab.token || '')); const [out, setOut] = useState<any>(null)
  const decode = () => { const p = token.split('.'); setOut({ decode: true, h: b64urlDecode(p[0] || ''), pl: b64urlDecode(p[1] || '') }) }
  const send = () => { const r = jwtVerifyVuln(token, lab.flag); if (r.ok && r.flag) onReveal(r.flag); setOut({ decode: false, ok: r.ok, reason: r.reason }) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Сервер доверяет JWT и принимает <code className="text-amber-300">alg:none</code>. Подделай токен с <code className="text-amber-300">role:admin</code>.</div>
      <textarea value={token} onChange={e => setToken(e.target.value)} rows={3} className={`w-full mb-2 px-2.5 py-2 ${mono} break-all`} style={inp} />
      <div className="flex gap-2 mb-2">
        <button onClick={decode} className="h-9 px-3.5 font-medium text-[13px]" style={btn}>Декодировать</button>
        <button onClick={send} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Отправить на сервер</button>
      </div>
      {out && (out.decode
        ? <pre className={`${mono} p-2.5 rounded-lg whitespace-pre-wrap`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>header: {out.h}{'\n'}payload: {out.pl}</pre>
        : <div className={`${mono} p-2.5 rounded-lg`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: out.ok ? '#6effa0' : '#ff9a9a' }}>{out.ok ? '✓ Доступ администратора получен!' : '✗ ' + out.reason}</div>)}
    </div>
  )
}

function ReconLab({ lab, onReveal }: any) {
  const [showSrc, setShowSrc] = useState(false)
  useEffect(() => { if (showSrc) { const f = String(lab.source || '').match(/FLAG\{[^}]*\}/); if (f) onReveal(f[0]) } }, [showSrc])
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Иногда секрет спрятан прямо в коде страницы. Открой исходный код и осмотри его.</div>
      <div className="rounded-lg overflow-hidden mb-2" style={{ border: '1px solid rgba(255,255,255,.1)' }}>
        <iframe title="recon" sandbox="" srcDoc={lab.render || lab.source || ''} style={{ width: '100%', height: 120, background: '#fff', border: 0 }} />
      </div>
      <button onClick={() => setShowSrc(s => !s)} className="h-9 px-3.5 font-medium text-[13px] mb-2" style={btn}>{showSrc ? 'Скрыть' : 'Посмотреть исходный код'}</button>
      {showSrc && <pre className={`${mono} p-2.5 rounded-lg whitespace-pre-wrap break-all`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>{lab.source}</pre>}
    </div>
  )
}


function NoSqliLab({ lab, onReveal }: any) {
  const [body, setBody] = useState(String(lab.defaultBody || '{"user":"admin","pass":"?"}')); const [msg, setMsg] = useState<any>(null)
  const go = () => { const r = noSqli(lab.users || [], body); if (r.ok) onReveal(lab.flag); setMsg(r) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Вход (NoSQL/Mongo). Тело запроса — JSON. Сервер ищет <code className="text-amber-300">db.users.find(тело)</code> без фильтрации операторов.</div>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
      <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Войти</button>
      {msg && <div className={`${mono} p-2.5 rounded-lg mt-2`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: msg.ok ? '#6effa0' : '#ff9a9a' }}>{msg.err ? '⚠ ' + msg.err : msg.ok ? '✓ Вход выполнен как ' + msg.who : '✗ Неверные данные'}</div>}
    </div>
  )
}
function SstiLab({ lab, onReveal }: any) {
  const [v, setV] = useState(''); const [out, setOut] = useState<any>(null)
  const go = () => { const r = ssti(v, lab.flag); if (r.flag) onReveal(r.flag); setOut(r) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Поле «Имя» подставляется в шаблон на сервере. Проверь инъекцию: <code className="text-amber-300">{'{{7*7}}'}</code>, затем доберись до <code className="text-amber-300">{'{{config}}'}</code>.</div>
      <div className="flex gap-2 mb-2"><input value={v} onChange={e => setV(e.target.value)} placeholder="Имя" className={`flex-1 px-2.5 py-2 ${mono}`} style={inp} /><button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Отправить</button></div>
      {out && <div className={`${mono} p-2.5 rounded-lg`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>Привет, {out.out}{out.confirmed && !out.flag ? '  ← шаблон выполнил выражение!' : ''}</div>}
    </div>
  )
}
function SsrfLab({ lab, onReveal }: any) {
  const [url, setUrl] = useState(''); const [out, setOut] = useState('')
  const go = () => { const r = ssrf(url, lab.secret || ''); if (r.flag) onReveal(r.flag); setOut(r.out) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Сервис загружает превью по URL (<code className="text-amber-300">/fetch?url=...</code>). Заставь сервер обратиться к внутреннему ресурсу.</div>
      <div className="flex gap-2 mb-2"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://..." className={`flex-1 px-2.5 py-2 ${mono}`} style={inp} /><button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Загрузить</button></div>
      {out && <pre className={`${mono} p-2.5 rounded-lg whitespace-pre-wrap`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>{out}</pre>}
    </div>
  )
}
function XxeLab({ lab, onReveal }: any) {
  const [xml, setXml] = useState(String(lab.defaultXml || '<?xml version="1.0"?>\n<data>привет</data>')); const [out, setOut] = useState('')
  const go = () => { const r = xxe(xml, lab.fileContent || ''); if (r.flag) onReveal(r.flag); setOut(r.out) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Сервер парсит присланный XML и допускает внешние сущности (XXE). Прочитай файл сервера.</div>
      <textarea value={xml} onChange={e => setXml(e.target.value)} rows={4} className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
      <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Отправить XML</button>
      {out && <pre className={`${mono} p-2.5 rounded-lg mt-2 whitespace-pre-wrap`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: '#9db' }}>{out}</pre>}
    </div>
  )
}
function BruteLab({ lab, onReveal }: any) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [msg, setMsg] = useState<any>(null)
  const go = () => { const r = bruteLogin(lab.accepted || [], u, p); if (r.flag) onReveal(r.flag); setMsg(r) }
  return (
    <div>
      <div className="text-[13px] leading-[1.5] text-gray mb-2">Форма входа. Пароль не менялся с установки — попробуй типовые/дефолтные учётки (admin/admin, admin/password, admin/123456...).</div>
      <input value={u} onChange={e => setU(e.target.value)} placeholder="логин" className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
      <input value={p} onChange={e => setP(e.target.value)} placeholder="пароль" className={`w-full mb-2 px-2.5 py-2 ${mono}`} style={inp} />
      <button onClick={go} className="h-9 px-4 rounded-[11px] bg-green text-ink font-semibold text-[13px]">Войти</button>
      {msg && <div className={`${mono} p-2.5 rounded-lg mt-2`} style={{ background: '#0d0f13', border: '1px solid rgba(255,255,255,.08)', color: msg.ok ? '#6effa0' : '#ff9a9a' }}>{msg.ok ? '✓ Вход выполнен!' : '✗ Неверная пара логин/пароль'}</div>}
    </div>
  )
}
