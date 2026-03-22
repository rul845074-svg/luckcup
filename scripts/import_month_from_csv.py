"""
LuckCup 单月补导脚本（CSV 版）

适用场景：
- .numbers 文件解析异常，某个月需要单独补导
- 先在 Numbers 中把“X月收入”和“X月支出”分别导出为 CSV

用法示例：
python3 scripts/import_month_from_csv.py \
  --month 2026-02 \
  --income-csv "/path/to/2月收入.csv" \
  --expense-csv "/path/to/2月支出.csv"

输出：
- scripts/output/month_import_2026_02.sql
"""

from __future__ import annotations

import argparse
import calendar
import csv
import re
import uuid
from collections import Counter
from pathlib import Path

from import_historical_data import EXPENSE_MAP, INCOME_MAP, escape_sql


OUTPUT_DIR = Path(__file__).parent / "output"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="从导出的 CSV 生成单月补导 SQL")
    parser.add_argument("--month", required=True, help="月份，格式 YYYY-MM，例如 2026-02")
    parser.add_argument("--income-csv", required=True, help="收入 CSV 路径")
    parser.add_argument("--expense-csv", required=True, help="支出 CSV 路径")
    parser.add_argument("--shop-id", help="指定导入到哪个 shop_id，强烈建议传这个参数")
    parser.add_argument(
        "--output",
        help="输出 SQL 路径，默认 scripts/output/month_import_YYYY_MM.sql",
    )
    return parser.parse_args()


def normalize(text) -> str:
    if text is None:
        return ""
    return str(text).strip()


def is_summary_label(text) -> bool:
    value = normalize(text)
    if not value:
        return False
    return bool(re.fullmatch(r"\d+(?:\.\d+)?", value))


def parse_amount(raw):
    text = normalize(raw)
    if not text:
        return None
    text = text.replace(",", "").replace("¥", "").replace("￥", "")
    try:
        amount = float(text)
    except ValueError:
        return None
    if amount <= 0:
        return None
    return round(amount, 2)


def detect_columns(row):
    lookup = {normalize(value): idx for idx, value in enumerate(row)}
    if {"日期", "金额", "类别"}.issubset(lookup):
        return lookup["日期"], lookup["金额"], lookup["类别"]

    if len(row) >= 4:
        return 1, 2, 3
    if len(row) >= 3:
        return 0, 1, 2
    raise ValueError("CSV 列数不足，无法识别日期/金额/类别列")


def parse_date(raw, year: int, month: int):
    text = normalize(raw)
    if not text:
        return None

    patterns = [
        r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$",
        r"^(\d{1,2})[./-](\d{1,2})$",
        r"^(\d{1,2})月(\d{1,2})日$",
    ]

    for pattern in patterns:
        match = re.match(pattern, text)
        if not match:
            continue
        groups = [int(g) for g in match.groups()]
        if len(groups) == 3:
            d_year, d_month, d_day = groups
        else:
            d_year, d_month, d_day = year, groups[0], groups[1]
        if d_month != month:
            continue
        max_day = calendar.monthrange(d_year, d_month)[1]
        d_day = max(1, min(d_day, max_day))
        return f"{d_year:04d}-{d_month:02d}-{d_day:02d}"

    return None


def parse_csv(path: Path, year: int, month: int, entry_type: str):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))

    if not rows:
        return []

    date_idx, amount_idx, category_idx = detect_columns(rows[1] if len(rows) > 1 else rows[0])
    current_date = None
    entries = []

    for row in rows[2:]:
        if not row:
            continue

        date_raw = row[date_idx] if date_idx < len(row) else ""
        amount_raw = row[amount_idx] if amount_idx < len(row) else ""
        category_raw = row[category_idx] if category_idx < len(row) else ""

        category = normalize(category_raw)
        if not category or category in {"类别", "合计", "总计"}:
            continue
        if is_summary_label(category):
            continue

        amount = parse_amount(amount_raw)
        if amount is None:
            continue

        parsed_date = parse_date(date_raw, year, month)
        if parsed_date is not None:
            current_date = parsed_date
        if current_date is None:
            current_date = f"{year:04d}-{month:02d}-01"

        entries.append(
            {
                "date": current_date,
                "amount": amount,
                "original_category": category,
                "type": entry_type,
            }
        )

    return entries


def map_entry(entry):
    mapping = INCOME_MAP if entry["type"] == "income" else EXPENSE_MAP
    result = mapping.get(entry["original_category"])
    if result is None:
        return None, None
    return result


def build_sql(month: str, entries, shop_id: str | None = None):
    daily_income = []
    expenses = []
    backend_entries = []
    unmapped = []

    for entry in entries:
        mapped = map_entry(entry)
        if mapped == (None, None):
            unmapped.append(entry["original_category"])
            continue

        mode, target = mapped
        if mode == "前台":
            if entry["type"] == "income":
                daily_income.append({**entry, "platform": target})
            else:
                expenses.append({**entry, "category": target})
        else:
            backend_entries.append(
                {
                    **entry,
                    "be_type": entry["type"],
                    "category": target,
                }
            )

    income_agg = {}
    for item in daily_income:
        key = (item["date"], item["platform"])
        income_agg[key] = income_agg.get(key, 0) + item["amount"]

    lines = [
        "-- LuckCup 单月补导 SQL（CSV 生成）",
        f"-- month: {month}",
    ]
    shop_value = "@shop_id"
    if shop_id:
        lines.append(f"-- shop_id: {shop_id}")
        shop_value = f"'{escape_sql(shop_id)}'"
    else:
        lines.append("SET @shop_id = (SELECT id FROM shops LIMIT 1);")
    lines.extend(["", "-- ===== 前台收入 (daily_income) ====="])

    for (date, platform), amount in sorted(income_agg.items()):
        lines.append(
            f"INSERT IGNORE INTO daily_income (id, shop_id, date, platform, amount) "
            f"VALUES ('{uuid.uuid4()}', {shop_value}, '{date}', '{escape_sql(platform)}', {amount:.2f});"
        )

    lines.extend(["", "-- ===== 前台支出 (expenses) ====="])
    for item in expenses:
        lines.append(
            f"INSERT IGNORE INTO expenses (id, shop_id, date, category, amount, note) "
            f"VALUES ('{uuid.uuid4()}', {shop_value}, '{item['date']}', '{escape_sql(item['category'])}', "
            f"{item['amount']:.2f}, '补导-{escape_sql(item['original_category'])}');"
        )

    lines.extend(["", "-- ===== 后台补录 (backend_entries) ====="])
    for item in backend_entries:
        lines.append(
            f"INSERT IGNORE INTO backend_entries (id, shop_id, date, type, category, amount, note, original_name) "
            f"VALUES ('{uuid.uuid4()}', {shop_value}, '{item['date']}', '{item['be_type']}', "
            f"'{escape_sql(item['category'])}', {item['amount']:.2f}, '补导', "
            f"'{escape_sql(item['original_category'])}');"
        )

    return lines, {
        "income_rows": len(income_agg),
        "expense_rows": len(expenses),
        "backend_rows": len(backend_entries),
        "unmapped": Counter(unmapped),
    }


def main():
    args = parse_args()
    year, month = map(int, args.month.split("-"))
    income_csv = Path(args.income_csv)
    expense_csv = Path(args.expense_csv)

    if not income_csv.exists():
        raise FileNotFoundError(f"收入 CSV 不存在: {income_csv}")
    if not expense_csv.exists():
        raise FileNotFoundError(f"支出 CSV 不存在: {expense_csv}")

    income_entries = parse_csv(income_csv, year, month, "income")
    expense_entries = parse_csv(expense_csv, year, month, "expense")
    sql_lines, stats = build_sql(args.month, income_entries + expense_entries, args.shop_id)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = Path(args.output) if args.output else OUTPUT_DIR / f"month_import_{year}_{month:02d}.sql"
    output_path.write_text("\n".join(sql_lines), encoding="utf-8")

    print(f"✅ SQL 已生成: {output_path}")
    print(f"   前台收入: {stats['income_rows']} 条")
    print(f"   前台支出: {stats['expense_rows']} 条")
    print(f"   后台补录: {stats['backend_rows']} 条")
    if stats["unmapped"]:
        print("   未映射条目:")
        for name, count in stats["unmapped"].most_common():
            print(f"   - {name}: {count}")


if __name__ == "__main__":
    main()
