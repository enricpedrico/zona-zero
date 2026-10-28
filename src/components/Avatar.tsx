import { useEffect, useMemo, useState } from "react";
import { SeededRandom } from "../lib/random";

interface AvatarProps {
  name: string;
  seed: number;
  version?: number;
  imageBlob?: Blob;
  imageUrl?: string;
  size?: "small" | "medium" | "large" | "hero";
  dimmed?: boolean;
}

const skinTones = ["#f4c9a8", "#deb08a", "#bf805f", "#8d543b", "#593523"];
const uniformTones = ["#34483c", "#46513b", "#30464b", "#4e4538", "#293d35"];
const accentTones = ["#c6ff3d", "#f6a91a", "#ff5a3d", "#7fd3a7", "#d4c76d"];
const hairTones = ["#171916", "#3c2b22", "#725039", "#b59a6a", "#6a2323"];

export function Avatar({
  name,
  seed,
  version = 0,
  imageBlob,
  imageUrl,
  size = "medium",
  dimmed = false,
}: AvatarProps) {
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    if (!imageBlob) {
      setBlobUrl(undefined);
      return;
    }
    const nextUrl = URL.createObjectURL(imageBlob);
    setBlobUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [imageBlob]);

  const traits = useMemo(() => {
    const rng = new SeededRandom(`${seed}:${version}:avatar`);
    return {
      skin: rng.pick(skinTones),
      uniform: rng.pick(uniformTones),
      accent: rng.pick(accentTones),
      hair: rng.pick(hairTones),
      hairStyle: rng.int(0, 4),
      faceWidth: rng.int(31, 39),
      eyeGap: rng.int(8, 12),
      mark: rng.int(0, 3),
      background: rng.int(0, 3),
    };
  }, [seed, version]);

  const customSource = imageUrl ?? blobUrl;
  if (customSource) {
    return (
      <div className={`avatar avatar--${size}${dimmed ? " avatar--dimmed" : ""}`}>
        <img src={customSource} alt={name} />
      </div>
    );
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`avatar avatar--${size}${dimmed ? " avatar--dimmed" : ""}`}>
      <svg viewBox="0 0 100 100" role="img" aria-label={name}>
        <rect width="100" height="100" fill="#101715" />
        <path d="M0 80L100 24V100H0Z" fill={traits.uniform} />
        {traits.background === 0 && <circle cx="78" cy="20" r="24" fill="none" stroke={traits.accent} opacity=".24" />}
        {traits.background === 1 && <path d="M-10 24L110 72M-10 8L110 56" stroke={traits.accent} opacity=".16" strokeWidth="5" />}
        {traits.background === 2 && <path d="M8 16H92M8 25H70M70 8V34" stroke={traits.accent} opacity=".2" strokeWidth="2" />}
        {traits.background === 3 && <path d="M72 6v33M56 22h36" stroke={traits.accent} opacity=".26" strokeWidth="2" />}
        <path d="M18 100c3-20 14-31 32-31s29 11 32 31" fill={traits.uniform} />
        <path d="M33 73l17 14 17-14-6-8H39z" fill={traits.accent} opacity=".82" />
        <ellipse cx="50" cy="47" rx={traits.faceWidth / 2} ry="24" fill={traits.skin} />
        {traits.hairStyle === 0 && <path d="M31 42c0-20 37-27 39 2l-9-12-30 8z" fill={traits.hair} />}
        {traits.hairStyle === 1 && <path d="M30 47c-2-28 38-31 41-4L62 31 52 39 42 30z" fill={traits.hair} />}
        {traits.hairStyle === 2 && <path d="M31 44c3-21 36-24 38 1-10-8-21-12-38-1z" fill={traits.hair} />}
        {traits.hairStyle === 3 && <path d="M31 45c0-23 37-24 38 0l-5-13-8 7-8-10-7 9-7-6z" fill={traits.hair} />}
        {traits.hairStyle === 4 && <path d="M30 46c0-25 40-25 40 0h-5c-5-15-25-15-30 0z" fill={traits.hair} />}
        <circle cx={50 - traits.eyeGap} cy="48" r="2.2" fill="#18201d" />
        <circle cx={50 + traits.eyeGap} cy="48" r="2.2" fill="#18201d" />
        <path d="M45 60q5 3 10 0" fill="none" stroke="#6e4437" strokeWidth="1.5" />
        {traits.mark === 1 && <path d="M62 48l-6 13" stroke={traits.accent} strokeWidth="2" opacity=".75" />}
        {traits.mark === 2 && <path d="M34 53h9" stroke={traits.accent} strokeWidth="2" opacity=".75" />}
        {traits.mark === 3 && <circle cx="65" cy="55" r="3" fill="none" stroke={traits.accent} strokeWidth="1.5" />}
        <rect x="6" y="77" width="28" height="16" rx="2" fill="#0a0e0d" opacity=".84" />
        <text x="20" y="88" textAnchor="middle" fill={traits.accent} fontSize="8" fontFamily="monospace" fontWeight="700">
          {initials}
        </text>
      </svg>
    </div>
  );
}
