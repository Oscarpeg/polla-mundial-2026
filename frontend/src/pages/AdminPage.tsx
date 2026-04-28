import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import * as api from '../services/api';
import type { BracketStandingInput, Match, MatchResultInput, Team } from '../types';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const POSITIONS: Array<{ key: 'firstId' | 'secondId' | 'thirdId'; label: string }> = [
  { key: 'firstId', label: '1°' },
  { key: 'secondId', label: '2°' },
  { key: 'thirdId', label: '3°' },
];

export function AdminPage() {
  const matches = useMatchesStore((s) => s.matches);
  const isLoaded = useMatchesStore((s) => s.isLoaded);
  const fetchAll = useMatchesStore((s) => s.fetchAll);
  const updateMatchLocal = useMatchesStore((s) => s.updateMatchLocal);

  useEffect(() => {
    if (!isLoaded) void fetchAll();
  }, [isLoaded, fetchAll]);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const sortedMatches = useMemo(
    () =>
      [...matches].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    [matches],
  );

  return (
    <div className="page admin-page">
      <h1>Admin</h1>

      <section>
        <h2>Ingresar resultados</h2>
        <ul className="admin-match-list">
          {sortedMatches.map((m) => (
            <li key={m.id}>
              <span>
                <strong>[{m.phase}]</strong> {m.homeTeam?.name ?? 'TBD'} vs {m.awayTeam?.name ?? 'TBD'}
              </span>
              {m.matchStatus === 'FINISHED' && (
                <strong> {m.resultHome90}-{m.resultAway90}</strong>
              )}
              <button type="button" onClick={() => setEditingMatch(m)}>Ingresar resultado</button>
            </li>
          ))}
        </ul>
      </section>

      {editingMatch && (
        <ResultModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={(updated) => {
            updateMatchLocal(updated);
            setEditingMatch(null);
          }}
        />
      )}

      <BracketResolveSection matches={matches} />
    </div>
  );
}

interface ResultModalProps {
  match: Match;
  onClose: () => void;
  onSaved: (m: Match) => void;
}

function ResultModal({ match, onClose, onSaved }: ResultModalProps) {
  const [r, setR] = useState<MatchResultInput>({
    resultHome90: match.resultHome90 ?? 0,
    resultAway90: match.resultAway90 ?? 0,
    resultHomeET: match.resultHomeET ?? null,
    resultAwayET: match.resultAwayET ?? null,
    resultHomePen: match.resultHomePen ?? null,
    resultAwayPen: match.resultAwayPen ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.updateMatchResult(match.id, r);
      onSaved(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const numField = (val: number | null | undefined): string => (val == null ? '' : String(val));
  const parseNum = (v: string): number | null => (v === '' ? null : Math.max(0, parseInt(v, 10) || 0));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Ingresar resultado</h3>
        <p>{match.homeTeam?.name ?? 'TBD'} vs {match.awayTeam?.name ?? 'TBD'}</p>
        <form onSubmit={onSubmit}>
          <div>
            <label>90' Local: <input type="number" min={0} value={r.resultHome90}
              onChange={(e) => setR({ ...r, resultHome90: Math.max(0, parseInt(e.target.value, 10) || 0) })} required /></label>
            <label>90' Visitante: <input type="number" min={0} value={r.resultAway90}
              onChange={(e) => setR({ ...r, resultAway90: Math.max(0, parseInt(e.target.value, 10) || 0) })} required /></label>
          </div>
          <div>
            <label>ET Local (acumulado, opcional): <input type="number" min={0} value={numField(r.resultHomeET)}
              onChange={(e) => setR({ ...r, resultHomeET: parseNum(e.target.value) })} /></label>
            <label>ET Visitante: <input type="number" min={0} value={numField(r.resultAwayET)}
              onChange={(e) => setR({ ...r, resultAwayET: parseNum(e.target.value) })} /></label>
          </div>
          <div>
            <label>Pen Local (opcional): <input type="number" min={0} value={numField(r.resultHomePen)}
              onChange={(e) => setR({ ...r, resultHomePen: parseNum(e.target.value) })} /></label>
            <label>Pen Visitante: <input type="number" min={0} value={numField(r.resultAwayPen)}
              onChange={(e) => setR({ ...r, resultAwayPen: parseNum(e.target.value) })} /></label>
          </div>
          <button type="submit" disabled={saving}>Guardar</button>
          <button type="button" onClick={onClose}>Cancelar</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

interface BracketResolveProps {
  matches: Match[];
}

function BracketResolveSection({ matches }: BracketResolveProps) {
  const teamsByGroup = useMemo(() => {
    const seen = new Map<string, Team>();
    const byGroup = new Map<string, Team[]>();
    for (const m of matches) {
      if (m.phase !== 'GROUPS') continue;
      for (const t of [m.homeTeam, m.awayTeam]) {
        if (t && t.group && !seen.has(t.id)) {
          seen.set(t.id, t);
          if (!byGroup.has(t.group)) byGroup.set(t.group, []);
          byGroup.get(t.group)!.push(t);
        }
      }
    }
    for (const list of byGroup.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return byGroup;
  }, [matches]);

  type Standing = { firstId: string; secondId: string; thirdId: string };
  const [standings, setStandings] = useState<Record<string, Standing>>(() => {
    const init: Record<string, Standing> = {};
    for (const g of GROUPS) init[g] = { firstId: '', secondId: '', thirdId: '' };
    return init;
  });
  const [thirdsQualified, setThirdsQualified] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const onCheck = (g: string, checked: boolean) => {
    setThirdsQualified((prev) => {
      const next = new Set(prev);
      if (checked) next.add(g);
      else next.delete(g);
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (thirdsQualified.size !== 8) {
      setError('Debes seleccionar exactamente 8 grupos clasificados');
      return;
    }
    setSaving(true);
    try {
      const standingsArr: BracketStandingInput[] = GROUPS.map((g) => ({
        group: g,
        firstId: standings[g].firstId,
        secondId: standings[g].secondId,
        thirdId: standings[g].thirdId,
      }));
      await api.resolveBracket({
        standings: standingsArr,
        thirdsQualified: [...thirdsQualified],
      });
      setSaved(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al activar bracket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2>Activar bracket R32</h2>
      <form onSubmit={onSubmit}>
        <h3>Standings de cada grupo (1°, 2°, 3°)</h3>
        {GROUPS.map((g) => {
          const teams = teamsByGroup.get(g) ?? [];
          const cur = standings[g];
          const exclude = [cur.firstId, cur.secondId, cur.thirdId].filter(Boolean);
          return (
            <div key={g} className="standing-row">
              <strong>Grupo {g}: </strong>
              {POSITIONS.map(({ key, label }) => (
                <select
                  key={key}
                  value={cur[key]}
                  onChange={(e) =>
                    setStandings((s) => ({ ...s, [g]: { ...s[g], [key]: e.target.value } }))
                  }
                >
                  <option value="">{label}</option>
                  {teams.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={exclude.includes(t.id) && t.id !== cur[key]}
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          );
        })}

        <h3>Grupos cuyo 3° clasifica (selecciona 8)</h3>
        <div className="thirds-checkboxes">
          {GROUPS.map((g) => (
            <label key={g}>
              <input
                type="checkbox"
                checked={thirdsQualified.has(g)}
                onChange={(e) => onCheck(g, e.target.checked)}
              />
              {g}
            </label>
          ))}
        </div>
        <p>Seleccionados: {thirdsQualified.size}/8</p>

        <button type="submit" disabled={saving}>Activar bracket</button>
        {saved && <p>✓ Bracket activado</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
