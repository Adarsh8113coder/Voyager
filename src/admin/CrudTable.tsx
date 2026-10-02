import { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost } from '../lib/api'

export interface Field {
  key: string
  label: string
  type?: 'text' | 'number' | 'boolean' | 'list' // list = comma-separated string[]
  readOnly?: boolean // set by the server (e.g. generated id), not editable
}

interface Props {
  resource: string   // API path segment, e.g. 'cities', 'hotel-packages'
  primaryKey: string // field holding the row's id (e.g. 'id' or 'code')
  fields: Field[]
  title: string
  allowAdd?: boolean
  allowDelete?: boolean
  allowEdit?: boolean
}

type Row = Record<string, any>

const emptyRow = (fields: Field[]): Row => {
  const r: Row = {}
  for (const f of fields) r[f.key] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : ''
  return r
}

function toApi(row: Row, fields: Field[]): Row {
  const out: Row = {}
  for (const f of fields) {
    let v = row[f.key]
    if (f.type === 'list') v = String(v || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (f.type === 'number') v = Number(v) || 0
    out[f.key] = v
  }
  return out
}

function fromApi(row: Row, fields: Field[]): Row {
  const out: Row = { ...row }
  for (const f of fields) if (f.type === 'list') out[f.key] = (row[f.key] || []).join(', ')
  return out
}

export default function CrudTable({ resource, primaryKey, fields, title, allowAdd = true, allowDelete = true, allowEdit = true }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error } = await apiGet<Row[]>(resource)
    if (error) setError(error)
    else setRows((data || []).map((r) => fromApi(r, fields)))
    setLoading(false)
  }
  useEffect(() => { load() }, [resource])

  const save = async () => {
    if (!editing) return
    setError('')
    const { error } = await apiPost(resource, toApi(editing, fields))
    if (error) { setError(error); return }
    setEditing(null)
    load()
  }

  const remove = async (row: Row) => {
    if (!confirm(`Delete this ${title.toLowerCase()} record?`)) return
    const { error } = await apiDelete(`${resource}/${encodeURIComponent(row[primaryKey])}`)
    if (error) setError(error)
    else load()
  }

  const filtered = filter
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))
    : rows

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {allowAdd && (
          <button
            className="rounded-lg bg-cyan-glow/20 text-cyan-glow px-3 py-1.5 text-xs font-medium hover:bg-cyan-glow/30"
            onClick={() => setEditing(emptyRow(fields))}
          >
            + Add
          </button>
        )}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
      />

      {error && <div className="mb-3 rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">{error}</div>}

      {editing && (
        <div className="mb-4 rounded-xl border border-cyan-glow/30 bg-black/30 p-3 space-y-2">
          {fields.filter((f) => !f.readOnly || editing[f.key]).map((f) => (
            <div key={f.key}>
              <label className="block text-[11px] text-slate-400 mb-0.5">{f.label}</label>
              {f.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={!!editing[f.key]}
                  disabled={!!f.readOnly}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                />
              ) : (
                <input
                  value={editing[f.key] ?? ''}
                  disabled={!!f.readOnly}
                  type={f.type === 'number' ? 'number' : 'text'}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none disabled:opacity-50"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button className="rounded-lg bg-cyan-glow text-black px-3 py-1.5 text-xs font-medium" onClick={save}>Save</button>
            <button className="rounded-lg border border-white/15 px-3 py-1.5 text-xs" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r[primaryKey]} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
              <div className="truncate">
                {fields.slice(0, 3).map((f) => (
                  <span key={f.key} className="mr-3 text-slate-300">{String(r[f.key] ?? '')}</span>
                ))}
              </div>
              <div className="flex gap-2 shrink-0">
                {allowEdit && <button className="text-xs text-cyan-glow hover:underline" onClick={() => setEditing(r)}>Edit</button>}
                {allowDelete && <button className="text-xs text-red-400 hover:underline" onClick={() => remove(r)}>Delete</button>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-500">No records.</p>}
        </div>
      )}
    </div>
  )
}
