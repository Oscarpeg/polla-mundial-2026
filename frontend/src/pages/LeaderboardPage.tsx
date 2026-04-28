import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { LeaderboardEntry } from '../types';

export function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard()
      .then((r) => {
        setRows(r);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? 'Error al cargar el leaderboard');
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="page leaderboard-page">
      <h1>Leaderboard</h1>
      {rows.length === 0 ? (
        <p>No hay jugadores aún.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Jugador</th>
              <th>Puntos totales</th>
              <th>Partidos</th>
              <th>Globales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>{r.rank}</td>
                <td>{r.username}</td>
                <td><strong>{r.pointsTotal}</strong></td>
                <td>{r.pointsMatches}</td>
                <td>{r.pointsGlobal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
