-- ================================================================
-- LuckCup V1 运营系统 — Supabase 数据库 Schema
-- ================================================================
-- 执行顺序：直接在 Supabase Dashboard > SQL Editor 中粘贴运行
-- ================================================================


-- ----------------------------------------------------------------
-- 1. TABLE: shops
--    每个注册用户对应一家店铺，owner_id 关联 Supabase Auth 用户
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.shops            IS '店铺基本信息';
COMMENT ON COLUMN public.shops.owner_id  IS '关联 Supabase Auth 用户 ID';
COMMENT ON COLUMN public.shops.name      IS '店铺名称';


-- ----------------------------------------------------------------
-- 2. TABLE: shop_settings
--    与 shops 一对一，存储店铺可配置参数
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_settings (
  shop_id            uuid         PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  fixed_rent         numeric(12,2) NOT NULL DEFAULT 0 CHECK (fixed_rent >= 0),
  platforms          text[]        NOT NULL DEFAULT ARRAY[
                       '美团团购','美团外卖','淘宝闪购','抖音团购','小程序','收银机'
                     ],
  expense_categories text[]        NOT NULL DEFAULT ARRAY[
                       '普货','周边货物','工资','房租','水电','突发支出'
                     ],
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.shop_settings                    IS '店铺配置（与 shops 一对一）';
COMMENT ON COLUMN public.shop_settings.fixed_rent         IS '固定月租，用于保本计算';
COMMENT ON COLUMN public.shop_settings.platforms          IS '收入来源平台列表（JSON 数组）';
COMMENT ON COLUMN public.shop_settings.expense_categories IS '支出分类列表（JSON 数组）';


-- ----------------------------------------------------------------
-- 3. TABLE: daily_income
--    每天各平台的收入明细，(shop_id, date, platform) 唯一
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_income (
  id       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id  uuid         NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date     date         NOT NULL,
  platform text         NOT NULL,
  amount   numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  UNIQUE (shop_id, date, platform)
);

COMMENT ON TABLE  public.daily_income          IS '每日各平台收入明细';
COMMENT ON COLUMN public.daily_income.date     IS '日期，格式 YYYY-MM-DD';
COMMENT ON COLUMN public.daily_income.platform IS '收入平台名称，对应 shop_settings.platforms';
COMMENT ON COLUMN public.daily_income.amount   IS '当日该平台收入金额';


-- ----------------------------------------------------------------
-- 4. TABLE: expenses
--    支出记录，支持手动录入与自动生成（房租）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid         NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date       date         NOT NULL,
  category   text         NOT NULL,
  amount     numeric(12,2) NOT NULL CHECK (amount > 0),
  note       text         NOT NULL DEFAULT '',
  is_auto    boolean      NOT NULL DEFAULT false,
  created_at timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.expenses             IS '支出记录';
COMMENT ON COLUMN public.expenses.category   IS '支出分类，对应 shop_settings.expense_categories';
COMMENT ON COLUMN public.expenses.amount     IS '支出金额，必须大于 0';
COMMENT ON COLUMN public.expenses.note       IS '备注说明';
COMMENT ON COLUMN public.expenses.is_auto    IS '是否系统自动生成（如每月房租）';


-- ----------------------------------------------------------------
-- 5. INDEXES — 加速高频查询
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_shops_owner_id
  ON public.shops(owner_id);

CREATE INDEX IF NOT EXISTS idx_daily_income_shop_date
  ON public.daily_income(shop_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_income_shop_date_platform
  ON public.daily_income(shop_id, date, platform);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_date
  ON public.expenses(shop_id, date);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_category
  ON public.expenses(shop_id, category);


-- ----------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
--    后端使用 Service Role Key 自动绕过 RLS；
--    此处策略用于防止直接客户端越权访问。
-- ----------------------------------------------------------------
ALTER TABLE public.shops           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_income    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses        ENABLE ROW LEVEL SECURITY;

-- shops
CREATE POLICY "shop: select own"
  ON public.shops FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "shop: update own"
  ON public.shops FOR UPDATE
  USING (auth.uid() = owner_id);

-- shop_settings
CREATE POLICY "settings: select own"
  ON public.shop_settings FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "settings: update own"
  ON public.shop_settings FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- daily_income
CREATE POLICY "income: select own"
  ON public.daily_income FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "income: insert own"
  ON public.daily_income FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "income: update own"
  ON public.daily_income FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- expenses
CREATE POLICY "expenses: select own"
  ON public.expenses FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "expenses: insert own"
  ON public.expenses FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "expenses: update own"
  ON public.expenses FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "expenses: delete own"
  ON public.expenses FOR DELETE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
