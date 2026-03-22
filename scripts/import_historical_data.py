"""
LuckCup 历史数据导入脚本
从 .numbers 文件解析历史收支数据，生成 SQL 导入文件。

用法: python3 scripts/import_historical_data.py
输出: scripts/output/historical_import.sql
"""

import os
import re
import uuid
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
from numbers_parser import Document

# ===== 配置 =====

BASE = Path("/Users/zhanghu/Library/Mobile Documents/com~apple~Numbers/Documents/毛庄清单")

# 每个年份使用最完整的文件版本
FILES = [
    # (文件名, 年份, 要读取的月份)
    ("核对清单1.3 2.numbers", 2024, [8, 9, 10, 11, 12]),
    ("核对清单2025 12.numbers", 2025, list(range(1, 13))),
    ("核对清单2026 2.numbers", 2026, [1, 2]),
]

OUTPUT_DIR = Path(__file__).parent / "output"

# ===== 映射表 =====
# mode: "前台日录" → daily_income/expenses, "后台补录" → backend_entries

INCOME_MAP = {
    "雪王": ("前台", "门店收银"),
    "美团外卖": ("前台", "美团外卖"),
    "饿了么快手4.1已提现": ("前台", "外卖其他"),
    "美团团购": ("前台", "美团团购"),
    "饿了么": ("前台", "外卖其他"),
    "京东": ("前台", "外卖其他"),
    "抖音": ("前台", "抖音团购"),
    "余额➕利息1.74": ("后台", "营业外收入"),
    "现金": ("前台", "门店收银"),
    "饿了么11.1提现": ("前台", "外卖其他"),
    "饿了么外卖": ("前台", "外卖其他"),
    "在线点": ("前台", "小程序"),
    "美景": ("后台", "B端/客户收入"),
    "快手": ("前台", "抖音团购"),
    "冰淇淋": ("后台", "其他商品/原料转卖收入"),
    "现金（废品已转）": ("后台", "废品/退款类收入"),
    "借货": ("后台", "调货收入"),
    "脆筒": ("后台", "其他商品/原料转卖收入"),
    "帮报货": ("后台", "调货收入"),
    "学校": ("后台", "B端/客户收入"),
    "电费": ("后台", "费用回收/其他收入"),
    "冷链": ("后台", "调货收入"),
    "逸品香山": ("后台", "B端/客户收入"),
    "美团": ("前台", "美团外卖"),
    "现金➕废品": ("后台", "废品/退款类收入"),
    "10月现金": ("前台", "门店收银"),
    "脆筒铁观音橙子": ("后台", "其他商品/原料转卖收入"),
    "月湖冰淇淋": ("后台", "B端/客户收入"),
    "美团在线点": ("前台", "小程序"),
    "调货": ("后台", "调货收入"),
    "云闪付": ("前台", "门店收银"),
    "多莓": ("后台", "其他商品/原料转卖收入"),
    "美景报货": ("后台", "调货收入"),
    "塑杯杯盖": ("后台", "其他商品/原料转卖收入"),
    "塑杯多莓": ("后台", "其他商品/原料转卖收入"),
    "柚子": ("后台", "其他商品/原料转卖收入"),
    "冷链调货": ("后台", "调货收入"),
    "现金➕杯子": ("后台", "其他商品/原料转卖收入"),
    "蜜桃": ("后台", "其他商品/原料转卖收入"),
    "青提": ("后台", "其他商品/原料转卖收入"),
    "2箱柠檬": ("后台", "其他商品/原料转卖收入"),
    "冰淇淋茉莉茶": ("后台", "其他商品/原料转卖收入"),
    "橙汁青提": ("后台", "其他商品/原料转卖收入"),
    "烤鱼": ("后台", "营业外收入"),
    "脆筒香柠": ("后台", "其他商品/原料转卖收入"),
    "周边": ("后台", "周边商品收入"),
    "挂耳粗吸管橙子": ("后台", "其他商品/原料转卖收入"),
    "果蜜": ("后台", "其他商品/原料转卖收入"),
    "双杯纸袋": ("后台", "其他商品/原料转卖收入"),
    "利息": ("后台", "营业外收入"),
    "椰奶": ("后台", "其他商品/原料转卖收入"),
    "牛奶": ("后台", "其他商品/原料转卖收入"),
    "纸皮冰淇淋": ("后台", "其他商品/原料转卖收入"),
    "柠檬": ("后台", "其他商品/原料转卖收入"),
    "圣代勺": ("后台", "其他商品/原料转卖收入"),
    "香草": ("后台", "其他商品/原料转卖收入"),
    "苹果": ("后台", "其他商品/原料转卖收入"),
    "拿铁": ("后台", "周边商品收入"),
    "脆筒橙子": ("后台", "其他商品/原料转卖收入"),
    "龙井茶": ("后台", "其他商品/原料转卖收入"),
    "晶球": ("后台", "其他商品/原料转卖收入"),
    "橙子": ("后台", "其他商品/原料转卖收入"),
    "马克杯": ("后台", "周边商品收入"),
    "杯子": ("后台", "其他商品/原料转卖收入"),
    "橙子杯托": ("后台", "其他商品/原料转卖收入"),
    "垃圾袋退款": ("后台", "废品/退款类收入"),
    "乌龙茶-太妃": ("后台", "其他商品/原料转卖收入"),
    "结算": ("后台", "营业外收入"),
}

EXPENSE_MAP = {
    "报货": ("前台", "原料货品"),
    "工资": ("前台", "工资"),
    "分红": ("后台", "分红/老板支出"),
    "房租（半）": ("前台", "房租"),
    "电费": ("前台", "水电"),
    "冷链": ("前台", "原料货品"),
    "房租": ("前台", "房租"),
    "报货-毛巾": ("前台", "原料货品"),
    "报货充值": ("前台", "原料货品"),
    "普货冷链": ("前台", "原料货品"),
    "欧包": ("前台", "周边货物"),
    "周边": ("前台", "周边货物"),
    "报货-帮报": ("前台", "原料货品"),
    "佳一工资": ("前台", "工资"),
    "报货预存": ("前台", "原料货品"),
    "借货": ("前台", "原料货品"),
    "公司年度管理费": ("后台", "税费/管理费"),
    "冰淇淋": ("前台", "原料货品"),
    "水费➕水表": ("前台", "水电"),
    "香柠": ("前台", "原料货品"),
    "空调": ("前台", "其他支出"),
    "冷链香柠冰淇淋": ("前台", "原料货品"),
    "冷链单杯袋": ("前台", "原料货品"),
    "暑假工工资": ("前台", "工资"),
    "折叠门": ("前台", "其他支出"),
    "冷链荔枝": ("前台", "原料货品"),
    "邹工资": ("前台", "工资"),
    "水费": ("前台", "水电"),
    "香柠冰淇淋": ("前台", "原料货品"),
    "佳一预支": ("前台", "工资"),
    "酸奶": ("前台", "原料货品"),
    "冰淇淋香柠": ("前台", "原料货品"),
    "脆筒": ("前台", "原料货品"),
    "增值税": ("后台", "税费/管理费"),
    "塑杯": ("前台", "原料货品"),
    "面包干": ("前台", "周边货物"),
    "拿铁条": ("前台", "周边货物"),
    "红包": ("前台", "其他支出"),
    "咖啡豆冰糖": ("前台", "原料货品"),
    "饼干酱巧克力": ("前台", "原料货品"),
    "宽带": ("前台", "水电"),
    "风幕机": ("前台", "其他支出"),
    "马工资": ("前台", "工资"),
    "移动灯箱": ("前台", "其他支出"),
    "荔枝": ("前台", "原料货品"),
    "柚子": ("前台", "原料货品"),
    "鲜牛乳": ("前台", "原料货品"),
    "淼工资": ("前台", "工资"),
    "消杀": ("前台", "其他支出"),
    "杯子": ("前台", "原料货品"),
    "垃圾袋": ("前台", "原料货品"),
    "球型盖酸奶": ("前台", "原料货品"),
    "门帘": ("前台", "其他支出"),
    "香柠冰淇淋量杯": ("前台", "原料货品"),
    "卫生费": ("前台", "水电"),
    "修空调": ("前台", "其他支出"),
    "充电器音响": ("前台", "其他支出"),
    "宣传物料": ("前台", "其他支出"),
    "苹果": ("前台", "原料货品"),
    "咖啡豆纸袋拿铁": ("前台", "原料货品"),
    "香草2": ("前台", "原料货品"),
    "香柠3": ("前台", "原料货品"),
    "椰椰拿铁条": ("前台", "周边货物"),
    "焦糖饼干酱": ("前台", "原料货品"),
    "佳一工资吸管": ("前台", "工资"),
    "巧克力香柠": ("前台", "原料货品"),
    "香草香柠": ("前台", "原料货品"),
    "青提": ("前台", "原料货品"),
    "防污地毯": ("前台", "其他支出"),
    "奖品": ("前台", "其他支出"),
    "敏工资": ("前台", "工资"),
    "多莓果酱": ("前台", "原料货品"),
    "中秋红包": ("前台", "其他支出"),
    "咖啡豆热盖": ("前台", "原料货品"),
    "抹茶粉": ("前台", "原料货品"),
    "单杯纸袋托": ("前台", "原料货品"),
    "摩卡加豪士": ("前台", "周边货物"),
    "预支工资": ("前台", "工资"),
    "刘预支工资": ("前台", "工资"),
    "冰糖": ("前台", "原料货品"),
    "柠檬栀子面包": ("前台", "周边货物"),
    "帮报货": ("前台", "原料货品"),
    "豪士": ("前台", "周边货物"),
    "借柠檬": ("前台", "原料货品"),
    "芝香厚乳": ("前台", "原料货品"),
    "香草1": ("前台", "原料货品"),
    "抽纸": ("前台", "原料货品"),
    "挂耳": ("前台", "周边货物"),
    "扩音器": ("前台", "其他支出"),
    "置物架": ("前台", "其他支出"),
    "工资预支": ("前台", "工资"),
    "纸巾": ("前台", "原料货品"),
    "牛奶": ("前台", "原料货品"),
    "罚款": ("前台", "其他支出"),
    "玉米球": ("前台", "周边货物"),
    "细吸管": ("前台", "原料货品"),
    "咸蛋黄": ("前台", "周边货物"),
    "拿铁": ("前台", "周边货物"),
    "柠檬": ("前台", "原料货品"),
    "易撕贴": ("前台", "原料货品"),
    "废品转账": ("前台", "其他支出"),
    "开水机维修": ("前台", "其他支出"),
    "货拉拉": ("前台", "原料货品"),
    "订书针": ("前台", "原料货品"),
    "葡萄汁": ("前台", "原料货品"),
    "欧包纸": ("前台", "周边货物"),
    "手机支架": ("前台", "其他支出"),
    "橙子": ("前台", "原料货品"),
    "电池": ("前台", "其他支出"),
    "压泵": ("前台", "原料货品"),
    "冷冻柜电容": ("前台", "其他支出"),
    "补偿": ("前台", "其他支出"),
    "球型盖冰淇淋欧包": ("前台", "周边货物"),
    "按压泵": ("前台", "原料货品"),
    "离地垫": ("前台", "其他支出"),
    "自购香柠": ("前台", "原料货品"),
    "电子秤": ("前台", "其他支出"),
    "灭蝇纸": ("前台", "原料货品"),
    "订书机": ("前台", "其他支出"),
    "焦糖饼干": ("前台", "周边货物"),
    "海绵擦": ("前台", "原料货品"),
    "废品": ("前台", "其他支出"),
    "修门": ("前台", "其他支出"),
    "大量杯": ("前台", "原料货品"),
    "保鲜膜": ("前台", "原料货品"),
    "洗刷刷维修": ("前台", "其他支出"),
    "小白擦": ("前台", "原料货品"),
    "太妃-巧克力": ("前台", "原料货品"),
    "地贴": ("前台", "其他支出"),
    "柠檬框": ("前台", "原料货品"),
    "活动物料地贴": ("前台", "其他支出"),
    "刀片": ("前台", "原料货品"),
    "剪刀": ("前台", "其他支出"),
    "验钞笔": ("前台", "其他支出"),
    "拖把布": ("前台", "原料货品"),
    "订书钉": ("前台", "原料货品"),
    "充电头": ("前台", "其他支出"),
    "大桶": ("前台", "原料货品"),
    "条幅价格贴": ("前台", "其他支出"),
    "气球": ("前台", "其他支出"),
    "吊旗杆": ("前台", "其他支出"),
    "新春氛围": ("前台", "其他支出"),
    "胶带": ("前台", "原料货品"),
    "配钥匙": ("前台", "其他支出"),
    "门锁": ("前台", "其他支出"),
    "快递": ("前台", "原料货品"),
    "灭蝇灯管": ("前台", "其他支出"),
    "测温贴": ("前台", "原料货品"),
    "柠檬夹": ("前台", "原料货品"),
    "磨刀石": ("前台", "其他支出"),
    "发网": ("前台", "原料货品"),
    "香水柠檬": ("前台", "原料货品"),
    "灯管": ("前台", "其他支出"),
    "量杯": ("前台", "原料货品"),
    "编号贴20个": ("前台", "原料货品"),
    "蚊香": ("前台", "原料货品"),
    "调货": ("前台", "原料货品"),
    "净水器球阀": ("前台", "其他支出"),
    "球型盖": ("前台", "原料货品"),
    "小圆饼干": ("前台", "周边货物"),
    "纸杯": ("前台", "活动"),
    "物业费": ("前台", "物业"),
    "记号笔": ("前台", "其他"),
    "咖啡香牌": ("前台", "活动"),
}


def escape_sql(s):
    """转义 SQL 字符串中的特殊字符"""
    return str(s).replace("\\", "\\\\").replace("'", "\\'")


def parse_sheet(filepath, year, month, sheet_type):
    """
    解析一个工作表，返回条目列表。
    sheet_type: 'income' 或 'expense'
    """
    doc = Document(str(filepath))
    sheet_name = f"{month}月{'收入' if sheet_type == 'income' else '支出'}"

    sheet = None
    for s in doc.sheets:
        if s.name == sheet_name:
            sheet = s
            break
    if sheet is None:
        return []

    table = sheet.tables[0]
    entries = []
    current_date = None

    for r in range(2, table.num_rows):  # 跳过标题行
        date_val = table.cell(r, 1).value
        amount_val = table.cell(r, 2).value
        category_val = table.cell(r, 3).value

        if category_val is None or str(category_val).strip() == "":
            continue
        if amount_val is None:
            continue
        try:
            amount = float(amount_val)
        except (TypeError, ValueError):
            continue
        if amount <= 0:
            continue

        category = str(category_val).strip()

        # 解析日期
        if date_val is not None:
            date_str = str(date_val).strip()
            match = re.match(r"(\d{1,2})\.(\d{1,2})", date_str)
            if match:
                d_month = int(match.group(1))
                d_day = int(match.group(2))
                # 验证日期合法性
                if d_day > 31:
                    d_day = d_day // 10  # 10.70 → day=7
                if d_month == month and 1 <= d_day <= 31:
                    try:
                        import calendar
                        max_day = calendar.monthrange(year, month)[1]
                        d_day = min(d_day, max_day)
                    except ValueError:
                        pass
                    current_date = f"{year}-{month:02d}-{d_day:02d}"

        if current_date is None:
            # 没有日期的条目用月份第一天
            current_date = f"{year}-{month:02d}-01"

        entries.append({
            "date": current_date,
            "amount": round(amount, 2),
            "original_category": category,
            "type": sheet_type,
        })

    return entries


def map_entry(entry):
    """根据映射表确定条目去向"""
    cat = entry["original_category"]
    if entry["type"] == "income":
        mapping = INCOME_MAP.get(cat)
        if mapping is None:
            return None, None, cat
        mode, target = mapping
        return mode, target, cat
    else:
        mapping = EXPENSE_MAP.get(cat)
        if mapping is None:
            return None, None, cat
        mode, target = mapping
        return mode, target, cat


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_entries = []
    for filename, year, months in FILES:
        filepath = BASE / filename
        if not filepath.exists():
            print(f"  [跳过] 文件不存在: {filename}")
            continue
        print(f"读取 {filename} (年份 {year})...")
        for m in months:
            for stype in ["income", "expense"]:
                entries = parse_sheet(filepath, year, m, stype)
                all_entries.extend(entries)
                if entries:
                    print(f"  {year}-{m:02d} {stype}: {len(entries)} 条")

    print(f"\n共解析 {len(all_entries)} 条原始条目")

    # 分类统计
    daily_income = []  # → daily_income 表 (按日期+平台聚合)
    expenses = []  # → expenses 表
    backend_entries = []  # → backend_entries 表
    unmapped = []

    for entry in all_entries:
        mode, target, original = map_entry(entry)
        if mode is None:
            unmapped.append(original)
            continue
        if mode == "前台":
            if entry["type"] == "income":
                daily_income.append({**entry, "platform": target})
            else:
                expenses.append({**entry, "category": target})
        else:  # 后台
            backend_entries.append({
                **entry,
                "category": target,
                "be_type": entry["type"],
            })

    if unmapped:
        from collections import Counter
        print(f"\n⚠️  {len(unmapped)} 条未映射:")
        for name, count in Counter(unmapped).most_common():
            print(f"  {name}: {count}")

    # 聚合 daily_income: 同一天同一平台合并
    income_agg = {}
    for e in daily_income:
        key = (e["date"], e["platform"])
        income_agg[key] = income_agg.get(key, 0) + e["amount"]

    print(f"\n前台收入（聚合后）: {len(income_agg)} 条")
    print(f"前台支出: {len(expenses)} 条")
    print(f"后台补录: {len(backend_entries)} 条")

    # 生成 SQL
    sql_lines = []
    sql_lines.append("-- LuckCup 历史数据导入")
    sql_lines.append("-- 自动生成，请在腾讯云 MySQL 控制台执行")
    sql_lines.append("")
    sql_lines.append("SET @shop_id = (SELECT id FROM shops LIMIT 1);")
    sql_lines.append("")

    # daily_income: 使用 INSERT IGNORE 避免重复（有 UNIQUE KEY on shop_id+date+platform）
    sql_lines.append("-- ===== 前台收入 (daily_income) =====")
    for (date, platform), amount in sorted(income_agg.items()):
        uid = str(uuid.uuid4())
        sql_lines.append(
            f"INSERT IGNORE INTO daily_income (id, shop_id, date, platform, amount) "
            f"VALUES ('{uid}', @shop_id, '{date}', '{escape_sql(platform)}', {amount:.2f});"
        )

    # expenses: 使用 INSERT IGNORE，允许导入脚本在中断后重复执行
    sql_lines.append("")
    sql_lines.append("-- ===== 前台支出 (expenses) =====")
    for e in expenses:
        uid = str(uuid.uuid4())
        note = escape_sql(e["original_category"])
        sql_lines.append(
            f"INSERT IGNORE INTO expenses (id, shop_id, date, category, amount, note) "
            f"VALUES ('{uid}', @shop_id, '{e['date']}', '{escape_sql(e['category'])}', {e['amount']:.2f}, '历史导入-{note}');"
        )

    # backend_entries: 使用 INSERT IGNORE，允许导入脚本在中断后重复执行
    sql_lines.append("")
    sql_lines.append("-- ===== 后台补录 (backend_entries) =====")
    for e in backend_entries:
        uid = str(uuid.uuid4())
        sql_lines.append(
            f"INSERT IGNORE INTO backend_entries (id, shop_id, date, type, category, amount, note, original_name) "
            f"VALUES ('{uid}', @shop_id, '{e['date']}', '{e['be_type']}', '{escape_sql(e['category'])}', "
            f"{e['amount']:.2f}, '历史导入', '{escape_sql(e['original_category'])}');"
        )

    output_path = OUTPUT_DIR / "historical_import.sql"
    output_path.write_text("\n".join(sql_lines), encoding="utf-8")
    print(f"\n✅ SQL 已生成: {output_path}")
    print(f"   共 {len(sql_lines)} 行")


if __name__ == "__main__":
    main()
