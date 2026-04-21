import { useEffect, useState } from 'react';
import {
  getClients,
  getProducts,
  getQuotes,
  getSettlements,
} from '../api/services';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import type { Client, Product, Quote, Settlement } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface DashboardState {
  products: Product[];
  clients: Client[];
  quotes: Quote[];
  settlements: Settlement[];
}

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    products: [],
    clients: [],
    quotes: [],
    settlements: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [products, clients, quotes, settlements] = await Promise.all([
          getProducts(),
          getClients(),
          getQuotes(),
          getSettlements(),
        ]);

        setState({ products, clients, quotes, settlements });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el resumen',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const inventoryValue = state.products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0,
  );
  const quotesTotal = state.quotes.reduce((sum, quote) => sum + quote.total, 0);
  const pendingSettlements = state.settlements.filter(
    (settlement) => settlement.status === 'PENDING',
  ).length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Panel general</span>
          <h2>Operacion comercial de ConfortMuebles</h2>
          <p>
            Vista consolidada de productos, clientes, cotizaciones y
            liquidaciones.
          </p>
        </div>
      </header>

      {error ? <div className="message message--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard
          label="Productos"
          value={loading ? '...' : String(state.products.length)}
          helper="Catalogo activo"
        />
        <StatCard
          label="Clientes"
          value={loading ? '...' : String(state.clients.length)}
          helper="Base comercial"
        />
        <StatCard
          label="Cotizaciones"
          value={loading ? '...' : formatCurrency(quotesTotal)}
          helper="Monto cotizado"
        />
        <StatCard
          label="Inventario"
          value={loading ? '...' : formatCurrency(inventoryValue)}
          helper="Valor estimado"
        />
        <StatCard
          label="Liquidaciones pendientes"
          value={loading ? '...' : String(pendingSettlements)}
          helper="Por cerrar"
        />
      </div>

      <div className="content-grid">
        <SectionCard
          title="Ultimas cotizaciones"
          subtitle="Seguimiento rapido de la actividad reciente"
        >
          {state.quotes.length === 0 ? (
            <EmptyState
              title="Sin cotizaciones"
              description="Crea la primera cotizacion desde el modulo correspondiente."
            />
          ) : (
            <div className="list-stack">
              {state.quotes.slice(0, 4).map((quote) => (
                <article key={quote.id} className="summary-row">
                  <div>
                    <strong>{quote.code}</strong>
                    <p>{quote.client.name}</p>
                  </div>
                  <div className="summary-row__meta">
                    <span>{formatCurrency(quote.total)}</span>
                    <span>{formatDate(quote.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Liquidaciones recientes"
          subtitle="Cobros y cierres de venta"
        >
          {state.settlements.length === 0 ? (
            <EmptyState
              title="Sin liquidaciones"
              description="Genera una liquidacion a partir de una cotizacion para verla aqui."
            />
          ) : (
            <div className="list-stack">
              {state.settlements.slice(0, 4).map((settlement) => (
                <article key={settlement.id} className="summary-row">
                  <div>
                    <strong>{settlement.code}</strong>
                    <p>{settlement.quote.client.name}</p>
                  </div>
                  <div className="summary-row__meta">
                    <span>{formatCurrency(settlement.total)}</span>
                    <span className={`tag tag--${settlement.status.toLowerCase()}`}>
                      {settlement.status}
                    </span>
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
