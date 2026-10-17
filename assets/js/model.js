// Modelo de negocio. Los precios de la landing salen de acá (data-model) y un test verifica que coincidan:
// para ajustar un precio, se cambia acá y en index.html, y el test avisa si quedaron distintos.
// La proyección a 5 años y el retorno para inversores (projection, investorReturn) son para el pitch, no para el sitio.
import { groupThousands } from './engine.js';

export const ASSUMPTIONS = {
  populationAR: 46_044_703, // Censo 2022, INDEC
  autismPrevalence: 1 / 127, // OMS, datos 2021

  // Precios
  plusMonthlyUsd: 25,
  plusAnnualUsd: 240, // equivale a US$ 20 por mes
  comboFreeMonths: 6, // meses de Plus gratis al comprar el reloj con Umbral

  // Supuestos del escenario (para el pitch, no son resultados)
  annualShare: 0.6, // parte de los suscriptores que elige el plan anual
  comboCommissionUsd: 15, // ingreso por cada reloj vendido a través del combo
  storeFee: 0.15, // comisión de tiendas y medios de pago sobre las suscripciones

  // Crecimiento lento los primeros 3 años y más rápido después (suscriptores Plus activos y relojes del combo).
  years: [
    { year: 1, subscribers: 150, comboWatches: 30, fixedCosts: 90_000 },
    { year: 2, subscribers: 450, comboWatches: 90, fixedCosts: 120_000 },
    { year: 3, subscribers: 1_100, comboWatches: 220, fixedCosts: 160_000 },
    { year: 4, subscribers: 2_600, comboWatches: 520, fixedCosts: 230_000 },
    { year: 5, subscribers: 5_000, comboWatches: 1_000, fixedCosts: 320_000 },
  ],

  // Inversión
  investmentUsd: 100_000,
  investorEquity: 0.2, // parte de la empresa que recibe el inversor
  revenueMultiple: 3, // valuación estimada al año 5 = 3 veces los ingresos de ese año
};

// Ingreso promedio anual por suscriptor Plus, según la mezcla de planes mensual y anual.
export function revenuePerSubscriber(a = ASSUMPTIONS) {
  return a.annualShare * a.plusAnnualUsd + (1 - a.annualShare) * a.plusMonthlyUsd * 12;
}

// Proyección año por año: ingresos, costos, resultado y caja acumulada (sin contar la inversión).
export function projection(a = ASSUMPTIONS) {
  const arpu = revenuePerSubscriber(a);
  const autistic = Math.round(a.populationAR * a.autismPrevalence);
  let cumulative = 0;
  return a.years.map((y) => {
    const plusRevenue = Math.round(y.subscribers * arpu);
    const comboRevenue = y.comboWatches * a.comboCommissionUsd;
    const revenue = plusRevenue + comboRevenue;
    const storeFees = Math.round(plusRevenue * a.storeFee);
    const costs = y.fixedCosts + storeFees;
    const result = revenue - costs;
    cumulative += result;
    return { ...y, plusRevenue, comboRevenue, revenue, storeFees, costs, result, cumulative, penetration: y.subscribers / autistic };
  });
}

// Retorno para quien invierte: valuación al año 5, valor de su parte, múltiplo, ROI y tasa anual equivalente.
export function investorReturn(a = ASSUMPTIONS) {
  const p = projection(a);
  const last = p[p.length - 1];
  const valuation = last.revenue * a.revenueMultiple;
  const stake = valuation * a.investorEquity;
  const multiple = stake / a.investmentUsd;
  const years = p.length;
  return {
    neededCash: -Math.min(0, ...p.map((y) => y.cumulative)), // peor caja acumulada: lo mínimo que hay que financiar
    breakEvenYear: p.find((y) => y.result > 0)?.year ?? null,
    paybackYear: p.find((y) => y.cumulative > 0)?.year ?? null, // año en que la caja acumulada vuelve a ser positiva
    postMoney: a.investmentUsd / a.investorEquity,
    valuation,
    stake,
    multiple,
    roi: multiple - 1,
    annualReturn: multiple ** (1 / years) - 1,
  };
}

export const usd = (n) => `US$ ${groupThousands(n)}`;
export const pct = (f) => `${(f * 100).toFixed(1).replace('.', ',')}%`;
const pctRound = (f) => `${Math.round(f * 100)}%`;

// Valores exactamente como se muestran en la landing (data-model="clave").
export function displayValues(a = ASSUMPTIONS) {
  return {
    plusMonthly: usd(a.plusMonthlyUsd),
    plusAnnual: usd(a.plusAnnualUsd),
    plusAnnualPerMonth: usd(a.plusAnnualUsd / 12),
    annualSavings: pctRound(1 - a.plusAnnualUsd / (a.plusMonthlyUsd * 12)),
    comboFreeMonths: String(a.comboFreeMonths),
  };
}
