import type { ItemId, Locale, ParticipantState } from "../types";

export interface ItemDefinition {
  id: ItemId;
  kind: "weapon" | "survival";
  power: number;
  names: Record<Locale, string>;
}

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  { id: "compact_bow", kind: "weapon", power: 5, names: { ca: "arc compacte", es: "arco compacto", en: "compact bow" } },
  { id: "field_spear", kind: "weapon", power: 4, names: { ca: "llança de camp", es: "lanza de campo", en: "field spear" } },
  { id: "survival_hatchet", kind: "weapon", power: 4, names: { ca: "destral de supervivència", es: "hacha de supervivencia", en: "survival hatchet" } },
  { id: "shock_baton", kind: "weapon", power: 3, names: { ca: "bastó d'impulsos", es: "bastón de impulsos", en: "pulse baton" } },
  { id: "signal_launcher", kind: "weapon", power: 4, names: { ca: "llançador de senyals", es: "lanzador de señales", en: "signal launcher" } },
  { id: "tactical_slingshot", kind: "weapon", power: 2, names: { ca: "tirador tàctic", es: "tirachinas táctico", en: "tactical slingshot" } },
  { id: "rescue_blade", kind: "weapon", power: 3, names: { ca: "fulla de rescat", es: "hoja de rescate", en: "rescue blade" } },
  { id: "scrap_carbine", kind: "weapon", power: 6, names: { ca: "carabina de ferralla", es: "carabina de chatarra", en: "scrap carbine" } },
  { id: "medkit", kind: "survival", power: 5, names: { ca: "farmaciola", es: "botiquín", en: "medkit" } },
  { id: "light_armor", kind: "survival", power: 4, names: { ca: "armadura lleugera", es: "armadura ligera", en: "light armour" } },
  { id: "climbing_rope", kind: "survival", power: 3, names: { ca: "corda d'escalada", es: "cuerda de escalada", en: "climbing rope" } },
  { id: "ration_pack", kind: "survival", power: 2, names: { ca: "racions de camp", es: "raciones de campo", en: "field rations" } },
  { id: "water_filter", kind: "survival", power: 3, names: { ca: "filtre d'aigua", es: "filtro de agua", en: "water filter" } },
  { id: "binoculars", kind: "survival", power: 2, names: { ca: "prismàtics", es: "prismáticos", en: "binoculars" } },
  { id: "smoke_beacon", kind: "survival", power: 2, names: { ca: "balisa de fum", es: "baliza de humo", en: "smoke beacon" } },
];

const itemById = new Map(ITEM_DEFINITIONS.map((item) => [item.id, item]));

export const WEAPON_IDS = ITEM_DEFINITIONS.filter((item) => item.kind === "weapon").map((item) => item.id);
export const SURVIVAL_ITEM_IDS = ITEM_DEFINITIONS.filter((item) => item.kind === "survival").map((item) => item.id);

export function isItemId(value: unknown): value is ItemId {
  return typeof value === "string" && itemById.has(value as ItemId);
}

export function isWeapon(itemId: ItemId | undefined): boolean {
  return Boolean(itemId && itemById.get(itemId)?.kind === "weapon");
}

export function itemPower(itemId: ItemId | undefined): number {
  return itemId ? (itemById.get(itemId)?.power ?? 0) : 0;
}

export function getItemName(itemId: ItemId | undefined, locale: Locale): string {
  if (!itemId) return "";
  return itemById.get(itemId)?.names[locale] ?? itemId;
}

export function bestWeapon(inventory: readonly ItemId[]): ItemId | undefined {
  return inventory
    .filter(isWeapon)
    .sort((first, second) => itemPower(second) - itemPower(first))[0];
}

export function normalizeLoadout(participant: ParticipantState): ParticipantState {
  const inventory = (participant.inventory ?? []).filter(isItemId);
  const equippedWeapon =
    isItemId(participant.equippedWeapon) && isWeapon(participant.equippedWeapon) && inventory.includes(participant.equippedWeapon)
      ? participant.equippedWeapon
      : bestWeapon(inventory);
  return { ...participant, inventory, equippedWeapon };
}
