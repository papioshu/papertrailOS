import assert from "node:assert";
import { matchOpportunities } from "./opportunityEngine";

const has = (list: ReturnType<typeof matchOpportunities>, profiles: string[]) =>
  list.some((o) => o.profiles.length === profiles.length && profiles.every((p) => o.profiles.includes(p as never)));

// A venue fits all four and triggers both venue-shaped partnered combos.
const venue = matchOpportunities({ category: "event venue / lounge", type: "venue" });
assert(has(venue, ["papershoots"]), "venue → papershoots single");
assert(has(venue, ["caedis"]), "venue → caedis single");
assert(has(venue, ["papershoots", "caedis"]), "venue → papershoots+caedis partnered");
assert(has(venue, ["bombsquad", "zathena"]), "venue → bombsquad+zathena partnered");

// An artist is creative, not local-biz: BMBSQD + Papershoots partnered.
const artist = matchOpportunities({ category: "independent artist showcase", type: "artist" });
assert(has(artist, ["papershoots"]), "artist → papershoots");
assert(has(artist, ["bombsquad"]), "artist → bombsquad");
assert(has(artist, ["bombsquad", "papershoots"]), "artist → bombsquad+papershoots partnered");

// A barber is a Zathena local-biz that pairs with Papershoots content.
const barber = matchOpportunities({ category: "barber shop", type: "business", website: null });
assert(has(barber, ["zathena"]), "barber → zathena");
assert(has(barber, ["zathena", "papershoots"]), "barber → zathena+papershoots partnered");
// No website → Zathena angle is a build, fit boosted.
const z = barber.find((o) => o.profiles.length === 1 && o.profiles[0] === "zathena")!;
assert(/build/i.test(z.angle), "barber zathena → build angle when no website");
assert(z.fitScore >= 75, "barber zathena fit boosted for web gap");

// A car meet is Caedis + Papershoots (aerial + ground), not local-biz.
const carMeet = matchOpportunities({ category: "DFW car meet", type: "event" });
assert(has(carMeet, ["papershoots", "caedis"]), "car meet → papershoots+caedis partnered");

// Garbage input yields nothing.
assert(matchOpportunities({ category: "", type: "" }).length === 0, "empty → no opportunities");

// Every opportunity carries reasoning and is ranked.
assert(venue.every((o) => o.reasoning.length > 0), "every opportunity has reasoning");
assert(venue[0].fitScore >= venue[venue.length - 1].fitScore, "ranked by fit desc");

console.log("opportunityEngine.check: all assertions passed");
