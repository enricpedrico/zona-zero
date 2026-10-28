import type { ItemId } from "../types";

interface WeaponGlyphProps {
  itemId: ItemId;
  label?: string;
}

export function WeaponGlyph({ itemId, label }: WeaponGlyphProps) {
  return (
    <svg className={`weapon-glyph weapon-glyph--${itemId}`} viewBox="0 0 100 100" role={label ? "img" : undefined} aria-label={label}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {itemId === "compact_bow" && (
          <>
            <path d="M29 12c35 15 35 61 0 76M29 12c-11 20-11 56 0 76M24 50h59" strokeWidth="6" />
            <path d="m74 43 10 7-10 7" strokeWidth="5" />
          </>
        )}
        {itemId === "field_spear" && (
          <>
            <path d="M16 84 77 23" strokeWidth="7" />
            <path d="m73 11 16-3-3 16-10 10-13-13z" fill="currentColor" strokeWidth="3" />
          </>
        )}
        {itemId === "survival_hatchet" && (
          <>
            <path d="M28 87 62 20" strokeWidth="9" />
            <path d="M50 15c17-7 31-3 39 4L75 40c-8-6-18-8-31-4z" fill="currentColor" strokeWidth="3" />
          </>
        )}
        {itemId === "shock_baton" && (
          <>
            <path d="M29 83 68 20" strokeWidth="12" />
            <path d="m61 17 13 8M24 74l14 9" strokeWidth="6" />
            <path d="m68 10 5 7 8-4-3 9 8 4" strokeWidth="3" />
          </>
        )}
        {itemId === "signal_launcher" && (
          <>
            <path d="M14 42h61l10 14H36L22 74H10l11-22z" fill="currentColor" strokeWidth="3" />
            <path d="m49 56 11 29H43L34 56" fill="currentColor" strokeWidth="3" />
            <path d="M20 34h53" strokeWidth="8" />
          </>
        )}
        {itemId === "tactical_slingshot" && (
          <>
            <path d="M26 15 48 42v44M76 15 52 42" strokeWidth="10" />
            <path d="M27 14c12 12 35 12 49 0" strokeWidth="3" />
          </>
        )}
        {itemId === "rescue_blade" && (
          <>
            <path d="m24 84 13-21 14 13-18 17z" fill="currentColor" strokeWidth="3" />
            <path d="M39 65 77 15c8 17-3 42-28 60z" fill="currentColor" strokeWidth="3" />
          </>
        )}
        {itemId === "scrap_carbine" && (
          <>
            <path d="M8 40h68l15 13H43L27 69H11l12-19H8z" fill="currentColor" strokeWidth="3" />
            <path d="m51 53 12 30H45L36 53M31 31h36" strokeWidth="7" />
            <path d="M78 47h17" strokeWidth="6" />
          </>
        )}
      </g>
    </svg>
  );
}
