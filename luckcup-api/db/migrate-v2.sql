-- LuckCup V2 迁移脚本
-- 执行顺序：先建表（已在 init.sql 中），再执行此脚本

-- 1. 重命名平台
UPDATE daily_income SET platform = '外卖其他' WHERE platform = '淘宝闪购';
UPDATE daily_income SET platform = '门店收银' WHERE platform = '收银机';

-- 2. 重命名支出类别
UPDATE expenses SET category = '原料货品' WHERE category = '普货';
UPDATE expenses SET category = '其他支出' WHERE category = '突发支出';

-- 3. 更新 shop_settings 中的 JSON 列
-- platforms: 淘宝闪购 → 外卖其他, 收银机 → 门店收银
UPDATE shop_settings
SET platforms = REPLACE(REPLACE(platforms, '"淘宝闪购"', '"外卖其他"'), '"收银机"', '"门店收银"')
WHERE platforms LIKE '%淘宝闪购%' OR platforms LIKE '%收银机%';

-- expense_categories: 普货 → 原料货品, 突发支出 → 其他支出
UPDATE shop_settings
SET expense_categories = REPLACE(REPLACE(expense_categories, '"普货"', '"原料货品"'), '"突发支出"', '"其他支出"')
WHERE expense_categories LIKE '%普货%' OR expense_categories LIKE '%突发支出%';
