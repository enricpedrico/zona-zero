interface HighlightedEventTextProps {
  text: string;
  names: string[];
}

export interface EventTextSegment {
  text: string;
  participant: boolean;
}

export function segmentParticipantNames(text: string, names: string[]): EventTextSegment[] {
  const candidates = [...new Set(names.filter(Boolean))].sort((first, second) => second.length - first.length);
  const segments: EventTextSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextIndex = -1;
    let nextName = "";
    for (const name of candidates) {
      const index = text.indexOf(name, cursor);
      if (index !== -1 && (nextIndex === -1 || index < nextIndex || (index === nextIndex && name.length > nextName.length))) {
        nextIndex = index;
        nextName = name;
      }
    }

    if (nextIndex === -1) {
      segments.push({ text: text.slice(cursor), participant: false });
      break;
    }
    if (nextIndex > cursor) {
      segments.push({ text: text.slice(cursor, nextIndex), participant: false });
    }
    segments.push({ text: nextName, participant: true });
    cursor = nextIndex + nextName.length;
  }

  return segments;
}

export function HighlightedEventText({ text, names }: HighlightedEventTextProps) {
  return (
    <>
      {segmentParticipantNames(text, names).map((segment, index) =>
        segment.participant ? (
          <strong className="event-participant-name" key={`${segment.text}-${index}`}>
            {segment.text}
          </strong>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}
