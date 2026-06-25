// Runnable self-check for CSV + dedup. `npx tsx src/lib/leads.check.ts`
import assert from "node:assert";
import { parseCsv, parseCsvRecords, toCsv } from "./csv";
import { dedupKeys, dedupeBatch } from "./dedup";

// --- CSV: quoted commas, escaped quotes, embedded newline ---
const csv = 'name,address\n"Joe, Inc","12 Main St, #3"\n"He said ""hi""","a\nb"';
const rows = parseCsv(csv);
assert.deepEqual(rows[1], ["Joe, Inc", "12 Main St, #3"]);
assert.equal(rows[2][0], 'He said "hi"');
assert.equal(rows[2][1], "a\nb");

const recs = parseCsvRecords("businessName,phone\nBarber X,(817) 555-1212\n");
assert.equal(recs.length, 1);
assert.equal(recs[0].businessName, "Barber X");

// round-trip a value that needs escaping
const out = toCsv(["a", "b"], [{ a: 'x,"y"', b: "z" }]);
assert.equal(parseCsv(out)[1][0], 'x,"y"');

// --- Dedup ---
assert.deepEqual(
  dedupKeys({ website: "https://www.Foo.com/path" }),
  ["web:foo.com"],
);
assert.deepEqual(dedupKeys({ phone: "+1 (817) 555-1212" }), ["phone:8175551212"]);

const batch = [
  { businessName: "A", website: "http://a.com" },
  { businessName: "A dup", website: "https://www.a.com/" }, // same host
  { businessName: "B", phone: "817-555-0000" },
  { businessName: "B again", phone: "(817) 555-0000" }, // same phone
  { businessName: "C", email: "c@x.com" },
];
const { unique, duplicates } = dedupeBatch(batch, ["email:c@x.com"]);
assert.equal(duplicates, 3); // a-dup, b-again, c(existing)
assert.deepEqual(
  unique.map((u) => u.businessName),
  ["A", "B"],
);

console.log("leads.check: all assertions passed");
