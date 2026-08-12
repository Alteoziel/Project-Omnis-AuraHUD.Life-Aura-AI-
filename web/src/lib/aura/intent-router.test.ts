import { routeIntentLocal, constraintsFromRejection, countWords } from "@/lib/aura/intent-router";
import { parseConstraintRows, routeWithCorrections } from "@/lib/aura/corrections";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

{
  const r = routeIntentLocal("Buy milk tomorrow");
  assert(r.kind === "task" || r.kind === "reminder", "expected task/reminder");
  assert(r.due_on, "expected due_on for tomorrow");
  assert(r.provider === "local_rules", "provider");
}

{
  const r = routeIntentLocal("I spent $12 on lunch");
  assert(r.kind === "budget_note", "budget_note");
  assert(r.amount_cents === 1200, `amount ${r.amount_cents}`);
}

{
  const rejected = routeIntentLocal("Add milk");
  rejected.title = "Buy silk";
  const constraints = constraintsFromRejection("Add milk", rejected);
  const again = routeIntentLocal("Add milk", constraints);
  assert(again.kind === "unclear", "rejected title must not silently recur as same assert path");
}

{
  const rows = [
    {
      negative_constraints: [
        { type: "DO_NOT_ASSERT", value: "Buy silk", action_type: "task" },
      ],
    },
  ];
  assert(parseConstraintRows(rows).length === 1, "parse rows");
  const routed = routeWithCorrections("please Buy silk now", rows);
  assert(routed.kind === "unclear", "constraint filter");
}

assert(countWords("one two three") === 3, "word count");

console.log("aura intent/corrections tests passed");
