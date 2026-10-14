// Modelo de negocio estimado. Las cifras de la landing salen de acá y un test verifica que coincidan.
import { groupThousands } from './engine.js';

export const ASSUMPTIONS = {
  populationAR: 46_044_703, // Censo 2022, INDEC
  populationCABA: 3_121_707, // Censo 2022, INDEC
  autismPrevalence: 1 / 127, // OMS, datos 2021
  plusPriceUsdMonth: 3,
  schoolPriceUsdYear: 400,
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
export function displayValues(m = marketModel()) {
  return {
    autisticAR: groupThousands(m.autisticAR),
    autisticCABA: groupThousands(m.autisticCABA),
    'year1.plusSubscribers': groupThousands(m.year1.plusSubscribers),
    'year1.schools': groupThousands(m.year1.schools),
    'year1.insurers': groupThousands(m.year1.insurers),
    'year1.total': usd(m.year1.total),
    'year3.plusSubscribers': groupThousands(m.year3.plusSubscribers),
    'year3.schools': groupThousands(m.year3.schools),
    'year3.insurers': groupThousands(m.year3.insurers),
    'year3.total': usd(m.year3.total),
    'year3.penetration': pct(m.year3.penetration),
  };
}
