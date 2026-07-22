import { MeasurementUnit } from '../db/types';

export interface ParsedSegment {
  raw: string;
  quantity: number;
  unit: MeasurementUnit;
  quantityGuessed: boolean;
  name: string;
}

const UNIT_TOKEN =
  '(kilogrammes?|kg|grammes?|gr|g|millilitres?|ml|centilitres?|cl|litres?|l|' +
  'cuill[eè]res?\\s*(?:à|a)\\s*soupe|cuill[eè]res?\\s*(?:à|a)\\s*caf[eé]|' +
  'tranches?|verres?|tasses?|unit[eé]s?|portions?)';

const QUANTITY_RE = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${UNIT_TOKEN}?\\s*(?:de\\s+|d['’])?(.+)$`, 'i');

// Facteur pour ramener une quantité vers l'unité canonique (gramme ou
// millilitre) qu'accepte resolveIngredients ; les unités "discrètes"
// (cuillère, tranche...) passent telles quelles, converties en grammes via
// les équivalences déjà en base (food_unit_equivalences).
function mapUnit(token: string | undefined): { unit: MeasurementUnit; factor: number } {
  if (!token) return { unit: 'gramme', factor: 1 };
  const t = token.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^(kilogrammes?|kg)$/.test(t)) return { unit: 'gramme', factor: 1000 };
  if (/^(grammes?|gr|g)$/.test(t)) return { unit: 'gramme', factor: 1 };
  if (/^(millilitres?|ml)$/.test(t)) return { unit: 'millilitre', factor: 1 };
  if (/^(centilitres?|cl)$/.test(t)) return { unit: 'millilitre', factor: 10 };
  if (/^(litres?|l)$/.test(t)) return { unit: 'millilitre', factor: 1000 };
  if (/cuill.*soupe/.test(t)) return { unit: 'cuillere_a_soupe', factor: 1 };
  if (/cuill.*caf/.test(t)) return { unit: 'cuillere_a_cafe', factor: 1 };
  if (/^tranches?$/.test(t)) return { unit: 'tranche', factor: 1 };
  if (/^verres?$/.test(t)) return { unit: 'verre', factor: 1 };
  if (/^tasses?$/.test(t)) return { unit: 'tasse', factor: 1 };
  if (/^unit[eé]s?$/.test(t)) return { unit: 'unite', factor: 1 };
  if (/^portions?$/.test(t)) return { unit: 'portion', factor: 1 };
  return { unit: 'gramme', factor: 1 };
}

// Découpe un texte libre du type "200g de poulet cru, 150g de riz cru et
// 250g de haricots verts" en segments exploitables. Chaque segment est
// analysé indépendamment ; sans quantité explicite, on suppose 100 g (signalé
// via quantityGuessed pour que le frontend invite à vérifier).
export function parseIngredientText(text: string): ParsedSegment[] {
  return text
    .split(/,|\bet\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(QUANTITY_RE);
      if (!match) {
        return { raw, quantity: 100, unit: 'gramme' as MeasurementUnit, quantityGuessed: true, name: raw };
      }
      const [, rawQuantity, unitToken, name] = match;
      const { unit, factor } = mapUnit(unitToken);
      const quantity = parseFloat(rawQuantity.replace(',', '.')) * factor;
      return { raw, quantity, unit, quantityGuessed: false, name: name.trim() };
    });
}
