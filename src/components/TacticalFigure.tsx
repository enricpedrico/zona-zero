import { isWeapon } from "../engine/items";
import type { ItemId, ParticipantState } from "../types";
import { Avatar } from "./Avatar";
import { WeaponGlyph } from "./WeaponGlyph";

interface TacticalFigureProps {
  participant: ParticipantState;
  imageBlob?: Blob;
  weapon?: ItemId | null;
  size?: "small" | "medium" | "replay" | "hero";
  dimmed?: boolean;
  label?: boolean;
}

export function TacticalFigure({
  participant,
  imageBlob,
  weapon,
  size = "medium",
  dimmed = false,
  label = false,
}: TacticalFigureProps) {
  const palette = Math.abs(participant.avatarSeed) % 5;
  const build = Math.abs(participant.avatarSeed >>> 3) % 3;
  const gear = Math.abs(participant.avatarSeed >>> 6) % 4;
  const resolvedWeapon = weapon === undefined ? participant.equippedWeapon : weapon ?? undefined;
  const equipped = isWeapon(resolvedWeapon) ? resolvedWeapon : undefined;

  return (
    <div
      className={`tactical-figure tactical-figure--${size} tactical-figure--palette-${palette} tactical-figure--build-${build} tactical-figure--gear-${gear}${equipped ? " is-armed" : ""}${dimmed ? " is-dimmed" : ""}`}
      role="img"
      aria-label={participant.name}
    >
      <svg className="tactical-figure__body" viewBox="0 0 180 230" aria-hidden="true">
        <ellipse className="figure-shadow" cx="90" cy="215" rx="57" ry="9" />
        {gear === 3 && <path className="figure-cape" d="M44 92c-14 32-12 76 3 103l45-19 40 19c14-29 15-72 2-103L91 72Z" />}
        <path className="figure-backpack" d="M43 94c-15 4-22 22-18 59l27 11 15-63z" />
        <path className="figure-leg figure-leg--left" d="M58 154c-2 15-5 34-4 47l-24 7c-4 2-2 8 3 8h39l12-59z" />
        <path className="figure-leg figure-leg--right" d="M96 156c5 16 10 33 13 46l22 7c5 2 4 7-2 7H91l-13-58z" />
        <path className="figure-knee" d="M51 176h25l-3 15H50zM99 176h25l5 15h-26z" />
        <path className="figure-boot" d="m31 202 25-3 17 17H32c-7 0-8-9-1-14ZM107 200l24 3c8 5 7 13-1 13H91z" />
        <path className="figure-torso" d="M48 90Q90 68 132 90l-4 68q-38 19-76 0z" />
        <path className="figure-side-panel" d="m48 94 14 8-5 49-8 4zM132 94l-14 8 5 49 6 4z" />
        <path className="figure-vest" d="M60 92q30-13 60 0l-5 59q-25 12-50 0z" />
        <path className="figure-collar" d="m62 91 19 22 9-16 9 16 19-22-13-15H75z" />
        <path className="figure-belt" d="M57 143q33 8 66 0l-1 15q-32 9-64 0z" />
        <path className="figure-pouch" d="M64 147h17v15H64zM99 147h17v15H99z" />
        <path className="figure-strap" d="m61 94 52 54M119 93l-52 55" />
        <path className="figure-arm figure-arm--left" d="M53 96C36 102 24 121 23 143c0 12 16 16 22 5l21-37z" />
        <path className="figure-arm figure-arm--right" d="M127 96c17 6 29 23 31 43 1 12-14 17-21 7l-25-34z" />
        <circle className="figure-hand" cx="31" cy="148" r="9" />
        <circle className="figure-hand figure-hand--right" cx="150" cy="145" r="9" />
        <path className="figure-neck" d="M76 67h28v27H76z" />
        <path className="figure-badge" d="M84 121h12v12H84z" />
        {gear === 0 && <path className="figure-accessory" d="M57 101 43 92l-12 22 20 8zM123 101l14-9 12 22-20 8z" />}
        {gear === 1 && <path className="figure-accessory" d="M65 137h50v7H65zM79 115h22v8H79z" />}
        {gear === 2 && <path className="figure-accessory" d="M52 108h13v31H52zM115 108h13v31h-13z" />}
      </svg>
      <div className="tactical-figure__face">
        <Avatar
          name={participant.name}
          seed={participant.avatarSeed}
          version={participant.avatarVersion}
          imageBlob={imageBlob}
          size="medium"
          dimmed={dimmed}
        />
      </div>
      {equipped && (
        <div className="tactical-figure__weapon" aria-hidden="true">
          <WeaponGlyph itemId={equipped} />
        </div>
      )}
      {label && (
        <div className="tactical-figure__label">
          <strong>{participant.name}</strong>
          <span>{equipped?.replaceAll("_", " ") ?? "NO LOADOUT"}</span>
        </div>
      )}
    </div>
  );
}
