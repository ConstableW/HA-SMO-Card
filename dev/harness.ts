// Visual development harness: renders the card with the synthetic fixture and a frozen clock.
import { buildHass } from "../tests/fixtures/sample";
import "../src/index";

const params = new URLSearchParams(location.search);
const target = new Date(params.get("now") ?? "2025-05-13T10:30:00+02:00").getTime();
const RealDate = Date;
const offset = target - RealDate.now();
class FrozenDate extends RealDate {
  constructor(...args: any[]) {
    if (args.length) super(...(args as [any]));
    else super(RealDate.now() + offset);
  }
  static now() {
    return RealDate.now() + offset;
  }
}
(globalThis as any).Date = FrozenDate;

const theme = params.get("theme") ?? "dark";
document.body.dataset.theme = theme;
document.body.style.background = theme === "dark" ? "#0a0d14" : "#e9edf4";

const view = params.get("view") ?? "week";
const width = params.get("w") ?? "1400";
const host = document.getElementById("host")!;
host.style.width = width + "px";
const card = document.createElement("smo-schedule-card") as any;
host.append(card);
card.setConfig({
  type: "custom:smo-schedule-card",
  entity: "sensor.schule_nils_beispiel_stundenplan_heute",
  default_view: view,
  language: params.get("lang") ?? "de",
});
card.hass = buildHass({ themes: { darkMode: theme === "dark" } });
(window as any).card = card;
