import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createSettlement,
  deleteSettlement,
  getPendingQuotes,
  getSettlements,
  paySettlement,
} from '../api/services';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import type { Quote, Settlement } from '../types';
import { formatCurrency, formatDate } from '../utils';

export function SettlementsPage() {
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [pendingQuotesData, settlementsData] = await Promise.all([
        getPendingQuotes(),
        getSettlements(),
      ]);

      setPendingQuotes(pendingQuotesData);
      setSettlements(settlementsData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el modulo de liquidaciones',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuoteId) {
      setError('Selecciona una cotizacion para liquidar');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createSettlement(selectedQuoteId, notes.trim() || undefined);
      setSelectedQuoteId('');
      setNotes('');
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo crear la liquidacion',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePay(id: string) {
    try {
      await paySettlement(id);
      await loadData();
    } catch (payError) {
      setError(
        payError instanceof Error
          ? payError.message
          : 'No se pudo registrar el pago',
      );
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Se eliminara esta liquidacion. Deseas continuar?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteSettlement(id);
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la liquidacion',
      );
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Liquidaciones</span>
          <h2>Cierre de venta y control de pagos</h2>
          <p>Convierte cotizaciones en cobros y descuenta stock al marcar pagado.</p>
        </div>
      </header>

      {error ? <div className="message message--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard
          label="Pendientes por liquidar"
          value={String(pendingQuotes.length)}
          helper="Cotizaciones sin cierre"
        />
        <StatCard
          label="Liquidaciones"
          value={String(settlements.length)}
          helper="Registros creados"
        />
        <StatCard
          label="Pagadas"
          value={String(settlements.filter((settlement) => settlement.status === 'PAID').length)}
          helper="Ventas cerradas"
        />
      </div>

      <div className="content-grid content-grid--wide">
        <SectionCard
          title="Generar liquidacion"
          subtitle="Selecciona una cotizacion disponible y genera el cierre"
        >
          <form className="form-grid" onSubmit={handleCreate}>
            <label className="field field--full">
              <span>Cotizacion</span>
              <select
                value={selectedQuoteId}
                onChange={(event) => setSelectedQuoteId(event.target.value)}
              >
                <option value="">Selecciona una cotizacion</option>
                {pendingQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.code} - {quote.client.name} - {formatCurrency(quote.total)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>Notas</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button className="button button--primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Crear liquidacion'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Liquidaciones creadas"
          subtitle="Registrar pago descuenta stock de los productos involucrados"
        >
          {loading ? (
            <div className="message">Cargando liquidaciones...</div>
          ) : settlements.length === 0 ? (
            <EmptyState
              title="Sin liquidaciones"
              description="Todavia no se ha generado ningun cierre de venta."
            />
          ) : (
            <div className="cards-grid">
              {settlements.map((settlement) => (
                <article key={settlement.id} className="mini-card">
                  <div className="mini-card__header mini-card__header--stack">
                    <div>
                      <strong>{settlement.code}</strong>
                      <p>{settlement.quote.client.name}</p>
                    </div>
                    <span className={`tag tag--${settlement.status.toLowerCase()}`}>
                      {settlement.status}
                    </span>
                  </div>
                  <div className="mini-card__details">
                    <span>{formatCurrency(settlement.total)}</span>
                    <span>{formatDate(settlement.createdAt)}</span>
                  </div>
                  <div className="mini-card__details">
                    <span>Subtotal: {formatCurrency(settlement.subtotal)}</span>
                    <span>IVA: {formatCurrency(settlement.tax)}</span>
                    <span>Descuento: {formatCurrency(settlement.discount)}</span>
                  </div>
                  <div className="table-actions table-actions--stack-mobile">
                    {settlement.status === 'PENDING' ? (
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => void handlePay(settlement.id)}
                      >
                        Marcar pagado
                      </button>
                    ) : (
                      <span className="paid-label">
                        Pagado {settlement.paidAt ? formatDate(settlement.paidAt) : ''}
                      </span>
                    )}
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => void handleDelete(settlement.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
