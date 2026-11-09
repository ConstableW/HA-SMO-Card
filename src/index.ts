import { CARD_TAG, CARD_VERSION, SmoScheduleCard } from "./card";
import { EDITOR_TAG, SmoScheduleCardEditor } from "./editor";

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, SmoScheduleCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, SmoScheduleCardEditor);

const w = window as unknown as { customCards?: Array<Record<string, unknown>> };
w.customCards = w.customCards ?? [];
if (!w.customCards.some((c) => c.type === CARD_TAG)) {
  w.customCards.push({
    type: CARD_TAG,
    name: "SMO Stundenplan",
    description: "Stundenplan mit farbigen Änderungen für die Schulmanager-Online-Integration",
    preview: false,
    documentationURL: "https://github.com/ConstableW/smo-schedule-card",
  });
}

console.info(
  `%c SMO-SCHEDULE-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#2a6fdb;font-weight:700;border-radius:3px 0 0 3px",
  "color:#2a6fdb;background:#e8f1ff;font-weight:700;border-radius:0 3px 3px 0",
);
