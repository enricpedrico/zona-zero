import { describe, expect, it } from "vitest";
import { segmentParticipantNames } from "../src/components/HighlightedEventText";

describe("participant name highlighting", () => {
  it("highlights every exact participant name in a narrative", () => {
    expect(
      segmentParticipantNames(
        "Moises segueix el rastre de Jaume. Hi ha un enfrontament, però Moises escapa.",
        ["Moises", "Jaume"],
      ),
    ).toEqual([
      { text: "Moises", participant: true },
      { text: " segueix el rastre de ", participant: false },
      { text: "Jaume", participant: true },
      { text: ". Hi ha un enfrontament, però ", participant: false },
      { text: "Moises", participant: true },
      { text: " escapa.", participant: false },
    ]);
  });

  it("prefers the longest matching name and keeps text as plain content", () => {
    expect(segmentParticipantNames("<script>Jaume Junior</script>", ["Jaume", "Jaume Junior"])).toEqual([
      { text: "<script>", participant: false },
      { text: "Jaume Junior", participant: true },
      { text: "</script>", participant: false },
    ]);
  });
});
