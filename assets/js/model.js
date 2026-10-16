// Modelo de negocio estimado para el pitch. Los precios de la landing salen de acá y un test verifica que coincidan.
import { groupThousands } from './engine.js';

export const ASSUMPTIONS = {
  populationAR: 46_044_703, // Censo 2022, INDEC
  populationCABA: 3_121_707, // Censo 2022, INDEC
  autismPrevalence: 1 / 127, // OMS, datos 2021
  plusPriceUsdMonth: 5,
  schoolPriceUsdYear: 100, // escuelas públicas, en convenio con el Gobierno de la Ciudad
  insurerDealUsdYear: 50_000,
  year1: { plusSubscribers: 1_500, schools: 25, insurers: 0 },
  year3: { plusSubscribers: 12_000, schools: 300, insurers: 2 },
};

export function marketModel(a = ASSUMPTIONS) {
  const autisticAR = Math.round(a.populationAR * a.autismPrevalence);
  const autisticCABA = Math.round(a.populationCABA * a.autismPrevalence);
  const year = (y) => {
    const plusRevenue = y.plusSubscribers * a.plusPriceUsdMonth * 12;
    const schoolRevenue = y.schools * a.schoolPriceUsdYear;
    const insurerRevenue = y.insurers * a.insurerDealUsdYear;
    return {
      ...y,
      plusRevenue,
      schoolRevenue,
      insurerRevenue,
      total: plusRevenue + schoolRevenue + insurerRevenue,
      penetration: y.plusSubscribers / autisticAR,
    };
  };
  return { autisticAR, autisticCABA, year1: year(a.year1), year3: year(a.year3) };
}

export const usd = (n) => `US$ ${groupThousands(n)}`;
export const pct = (f) => `${(f * 100).toFixed(1).replace('.', ',')}%`;

// Valores exactamente como se muestran en la landing (data-model="clave").
// La tabla de ingresos quedó solo para el pitch: ver marketModel().
export function displayValues(a = ASSUMPTIONS) {
  return {
    plusPrice: usd(a.plusPriceUsdMonth),
    schoolPrice: usd(a.schoolPriceUsdYear),
  };
}