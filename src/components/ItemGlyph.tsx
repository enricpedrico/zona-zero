import {
  Binoculars,
  CircleDashed,
  Cross,
  RadioTower,
  Shield,
  Soup,
  Waves,
} from "lucide-react";
import { isWeapon } from "../engine/items";
import type { ItemId } from "../types";
import { WeaponGlyph } from "./WeaponGlyph";

interface ItemGlyphProps {
  itemId: ItemId;
  label?: string;
}

export function ItemGlyph({ itemId, label }: ItemGlyphProps) {
  if (isWeapon(itemId)) return <WeaponGlyph itemId={itemId} label={label} />;

  const Icon =
    itemId === "medkit"
      ? Cross
      : itemId === "light_armor"
        ? Shield
        : itemId === "water_filter"
          ? Waves
          : itemId === "binoculars"
            ? Binoculars
            : itemId === "smoke_beacon"
              ? RadioTower
              : itemId === "ration_pack"
                ? Soup
                : CircleDashed;

  return <Icon className={`item-glyph item-glyph--${itemId}`} role={label ? "img" : undefined} aria-label={label} />;
}
