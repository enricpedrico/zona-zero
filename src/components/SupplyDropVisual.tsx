import { PackageOpen } from "lucide-react";
import { getItemName, isWeapon } from "../engine/items";
import { translate } from "../i18n";
import type { ItemId, Locale, ParticipantState } from "../types";
import { ItemGlyph } from "./ItemGlyph";
import { TacticalFigure } from "./TacticalFigure";

interface SupplyDropVisualProps {
  participant: ParticipantState;
  itemId: ItemId;
  weapon?: ItemId | null;
  imageBlob?: Blob;
  locale: Locale;
}

export function SupplyDropVisual({ participant, itemId, weapon, imageBlob, locale }: SupplyDropVisualProps) {
  const t = <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key);
  const itemName = getItemName(itemId, locale);

  return (
    <div className="supply-drop-visual">
      <div className="supply-drop-visual__sky" aria-hidden="true">
        <svg viewBox="0 0 150 125">
          <path className="supply-canopy" d="M18 47C20 10 130 10 132 47c-19-12-95-12-114 0Z" />
          <path className="supply-lines" d="m20 44 43 54m67-54L87 98M75 39v59" />
          <path className="supply-crate" d="M56 91h38v27H56zM56 98h38M69 91v27M81 91v27" />
        </svg>
        <span>DROP / LOCKED</span>
      </div>
      <div className="supply-drop-visual__manifest">
        <span><PackageOpen /> {t("airdropIncoming")}</span>
        <div className="supply-item-lockup">
          <ItemGlyph itemId={itemId} />
          <div>
            <small>{t(isWeapon(itemId) ? "weaponClass" : "survivalClass")}</small>
            <strong>{itemName}</strong>
          </div>
        </div>
        <p>{participant.name} / {t("itemRecovered")}</p>
      </div>
      <div className="supply-drop-visual__figure">
        <TacticalFigure
          participant={participant}
          imageBlob={imageBlob}
          weapon={isWeapon(itemId) ? itemId : weapon}
          size="medium"
        />
      </div>
    </div>
  );
}
