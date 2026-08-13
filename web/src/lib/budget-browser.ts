import {
  budgetMonthDateRange,
  computeReadyToAssignCents,
  currentBudgetMonth,
} from "@/lib/money";
import type { Account, AssignMode, BudgetRow, GoalFrequency } from "@/lib/types";

type QueryClient = {
  // Browser and server Supabase clients both expose .from().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

const CATEGORY_COLUMNS =
  "id,group_id,name,sort_order,hidden,budget_id,assign_percent,assign_mode,assign_fixed_cents,assign_priority,exclude_from_overspend_cover,goal_cents,goal_name,goal_frequency,goal_note,goal_due_on";

function toAssignMode(value: unknown): AssignMode {
  return value === "fixed" ? "fixed" : "percent";
}

const GOAL_FREQUENCIES = new Set([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "once",
]);

function toGoalFrequency(value: unknown): GoalFrequency {
  return GOAL_FREQUENCIES.has(String(value))
    ? (String(value) as GoalFrequency)
    : "monthly";
}

function fail(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function loadBudgetLens(
  supabase: QueryClient,
  budgetId: string,
  month = currentBudgetMonth(),
): Promise<{
  month: string;
  rows: BudgetRow[];
  readyToAssignCents: number;
  groups: Array<{ id: string; name: string }>;
}> {
  const range = budgetMonthDateRange(month);
  if (!range) return { month, rows: [], readyToAssignCents: 0, groups: [] };

  const liveMonth = currentBudgetMonth();
  const includeFutureAssignments = month >= liveMonth;

  const [
    groupsRes,
    categoriesRes,
    assignmentsRes,
    priorAssignmentsRes,
    futureAssignmentsRes,
    txnsRes,
    priorTxnsRes,
  ] = await Promise.all([
    supabase
      .from("category_groups")
      .select("id,name,sort_order,hidden,budget_id")
      .eq("budget_id", budgetId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("budget_id", budgetId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("category_months")
      .select("category_id,month,assigned_cents")
      .eq("budget_id", budgetId)
      .eq("month", month),
    supabase
      .from("category_months")
      .select("category_id,assigned_cents")
      .eq("budget_id", budgetId)
      .lt("month", month),
    includeFutureAssignments
      ? supabase
          .from("category_months")
          .select("assigned_cents")
          .eq("budget_id", budgetId)
          .gt("month", month)
      : Promise.resolve({
          data: [] as Array<{ assigned_cents: number }>,
          error: null,
        }),
    supabase
      .from("transactions")
      .select("category_id,amount_cents,occurred_on")
      .eq("budget_id", budgetId)
      .gte("occurred_on", range.start)
      .lt("occurred_on", range.endExclusive),
    supabase
      .from("transactions")
      .select("category_id,amount_cents")
      .eq("budget_id", budgetId)
      .lt("occurred_on", range.start),
  ]);

  fail(groupsRes.error, "Failed to load category groups");
  fail(categoriesRes.error, "Failed to load categories");
  fail(assignmentsRes.error, "Failed to load assignments");
  fail(priorAssignmentsRes.error, "Failed to load prior assignments");
  fail(futureAssignmentsRes.error, "Failed to load future assignments");
  fail(txnsRes.error, "Failed to load transactions");
  fail(priorTxnsRes.error, "Failed to load prior transactions");

  const groupMap = new Map(
    ((groupsRes.data ?? []) as Array<{
      id: string;
      name: string;
      sort_order: number;
      hidden: boolean;
    }>).map((group) => [group.id, group]),
  );
  const assignedMap = new Map(
    ((assignmentsRes.data ?? []) as Array<{
      category_id: string;
      assigned_cents: number;
    }>).map((row) => [row.category_id, row.assigned_cents]),
  );

  const carryInMap = new Map<string, number>();
  for (const row of (priorAssignmentsRes.data ?? []) as Array<{
    category_id: string;
    assigned_cents: number;
  }>) {
    carryInMap.set(
      row.category_id,
      (carryInMap.get(row.category_id) ?? 0) + row.assigned_cents,
    );
  }
  for (const txn of (priorTxnsRes.data ?? []) as Array<{
    category_id: string | null;
    amount_cents: number;
  }>) {
    if (!txn.category_id) continue;
    carryInMap.set(
      txn.category_id,
      (carryInMap.get(txn.category_id) ?? 0) + txn.amount_cents,
    );
  }

  const activityMap = new Map<string, number>();
  let uncategorizedCurrent = 0;
  for (const txn of (txnsRes.data ?? []) as Array<{
    category_id: string | null;
    amount_cents: number;
  }>) {
    if (!txn.category_id) {
      uncategorizedCurrent += txn.amount_cents;
      continue;
    }
    activityMap.set(
      txn.category_id,
      (activityMap.get(txn.category_id) ?? 0) + txn.amount_cents,
    );
  }

  let uncategorizedPrior = 0;
  for (const txn of (priorTxnsRes.data ?? []) as Array<{
    category_id: string | null;
    amount_cents: number;
  }>) {
    if (txn.category_id == null) uncategorizedPrior += txn.amount_cents;
  }

  const priorAssignedTotal = (
    (priorAssignmentsRes.data ?? []) as Array<{ assigned_cents: number }>
  ).reduce((sum, row) => sum + row.assigned_cents, 0);
  const totalAssigned = (
    (assignmentsRes.data ?? []) as Array<{ assigned_cents: number }>
  ).reduce((sum, row) => sum + row.assigned_cents, 0);
  const futureAssignedTotal = includeFutureAssignments
    ? ((futureAssignmentsRes.data ?? []) as Array<{ assigned_cents: number }>).reduce(
        (sum, row) => sum + row.assigned_cents,
        0,
      )
    : 0;

  const rows: BudgetRow[] = (
    (categoriesRes.data ?? []) as Array<{
      id: string;
      group_id: string;
      name: string;
      sort_order: number;
      hidden: boolean;
      assign_percent?: number;
      assign_mode?: string | null;
      assign_fixed_cents?: number | null;
      assign_priority?: number | null;
      exclude_from_overspend_cover?: boolean | null;
      goal_cents?: number | null;
      goal_name?: string | null;
      goal_frequency?: string | null;
      goal_note?: string | null;
      goal_due_on?: string | null;
    }>
  )
    .filter((category) => !category.hidden)
    .map((category) => {
      const group = groupMap.get(category.group_id);
      const assignedCents = assignedMap.get(category.id) ?? 0;
      const activityCents = activityMap.get(category.id) ?? 0;
      const carryInCents = carryInMap.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        groupId: category.group_id,
        groupName: group?.name ?? "Ungrouped",
        groupSortOrder: Number(group?.sort_order ?? 0),
        categoryName: category.name,
        categorySortOrder: Number(category.sort_order ?? 0),
        assignedCents,
        activityCents,
        availableCents: carryInCents + assignedCents + activityCents,
        assignPercent: Number(category.assign_percent ?? 0),
        assignMode: toAssignMode(category.assign_mode),
        assignFixedCents: Number(category.assign_fixed_cents ?? 0),
        assignPriority: Math.max(
          0,
          Math.floor(Number(category.assign_priority ?? 0)),
        ),
        excludeFromOverspendCover: Boolean(category.exclude_from_overspend_cover),
        goalCents: category.goal_cents == null ? null : Number(category.goal_cents),
        goalName: category.goal_name ?? "",
        goalFrequency: toGoalFrequency(category.goal_frequency),
        goalNote: category.goal_note ?? "",
        goalDueOn: category.goal_due_on ?? null,
      };
    })
    .sort((a, b) => {
      if (a.groupSortOrder !== b.groupSortOrder) {
        return a.groupSortOrder - b.groupSortOrder;
      }
      const byGroupName = a.groupName.localeCompare(b.groupName);
      if (byGroupName !== 0) return byGroupName;
      if (a.categorySortOrder !== b.categorySortOrder) {
        return a.categorySortOrder - b.categorySortOrder;
      }
      return a.categoryName.localeCompare(b.categoryName);
    });

  return {
    month,
    rows,
    readyToAssignCents: computeReadyToAssignCents({
      uncategorizedPrior,
      uncategorizedCurrent,
      priorAssignedTotal,
      totalAssigned,
      futureAssignedTotal,
    }),
    groups: ((groupsRes.data ?? []) as Array<{
      id: string;
      name: string;
      hidden: boolean;
      sort_order: number;
    }>)
      .filter((group) => !group.hidden)
      .slice()
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      })
      .map((group) => ({ id: group.id, name: group.name })),
  };
}

export async function loadAccountsWithBalances(
  supabase: QueryClient,
  budgetId: string,
): Promise<Array<Account & { balanceCents: number }>> {
  const accountsRes = await supabase
    .from("accounts")
    .select("id,budget_id,name,account_type,currency,include_in_total,sort_order")
    .eq("budget_id", budgetId)
    .order("sort_order")
    .order("name");
  fail(accountsRes.error, "Failed to load accounts");

  const txnsRes = await supabase
    .from("transactions")
    .select("account_id,amount_cents")
    .eq("budget_id", budgetId);
  fail(txnsRes.error, "Failed to load account balances");

  const balances = new Map<string, number>();
  for (const txn of (txnsRes.data ?? []) as Array<{
    account_id: string;
    amount_cents: number;
  }>) {
    balances.set(
      txn.account_id,
      (balances.get(txn.account_id) ?? 0) + txn.amount_cents,
    );
  }

  return ((accountsRes.data ?? []) as Account[]).map((account) => ({
    ...account,
    balanceCents: balances.get(account.id) ?? 0,
  }));
}

export async function loadRecentTransactions(
  supabase: QueryClient,
  budgetId: string,
  limit = 40,
): Promise<
  Array<{
    id: string;
    occurred_on: string;
    payee: string;
    amount_cents: number;
    account_id: string;
  }>
> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id,occurred_on,payee,amount_cents,account_id")
    .eq("budget_id", budgetId)
    .order("occurred_on", { ascending: false })
    .limit(limit);
  fail(error, "Failed to load transactions");
  return (data ?? []) as Array<{
    id: string;
    occurred_on: string;
    payee: string;
    amount_cents: number;
    account_id: string;
  }>;
}

export async function saveAssignment(input: {
  supabase: QueryClient;
  userId: string;
  budgetId: string;
  categoryId: string;
  month: string;
  assignedCents: number;
}) {
  const monthUpsert = await input.supabase.from("budget_months").upsert(
    {
      user_id: input.userId,
      budget_id: input.budgetId,
      month: input.month,
    },
    { onConflict: "budget_id,month" },
  );
  fail(monthUpsert.error, "Could not save budget month");

  const { error } = await input.supabase.from("category_months").upsert(
    {
      user_id: input.userId,
      budget_id: input.budgetId,
      category_id: input.categoryId,
      month: input.month,
      assigned_cents: input.assignedCents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "budget_id,category_id,month" },
  );
  fail(error, "Could not save assignment");
}
