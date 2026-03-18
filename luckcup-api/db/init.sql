-- LuckCup 运营系统 MySQL 建表语句
-- 数据库：luckcup（请在腾讯云控制台先创建好数据库，再执行此脚本）
-- 字符集：utf8mb4

-- 1. 用户表（替代 Supabase Auth）
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  phone      VARCHAR(20)  NOT NULL UNIQUE COMMENT '手机号（登录账号）',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 加密后的密码',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 2. 店铺表
CREATE TABLE IF NOT EXISTS shops (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  owner_id   VARCHAR(36)  NOT NULL COMMENT '关联 users.id',
  name       VARCHAR(100) NOT NULL DEFAULT 'LuckCup 我的店铺',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='店铺表';

-- 3. 店铺设置表
CREATE TABLE IF NOT EXISTS shop_settings (
  id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
  shop_id             VARCHAR(36)   NOT NULL UNIQUE COMMENT '关联 shops.id',
  fixed_rent          DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '固定月租金',
  platforms           JSON          COMMENT '收入平台列表',
  expense_categories  JSON          COMMENT '支出类别列表',
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='店铺设置表';

-- 4. 每日收入表
CREATE TABLE IF NOT EXISTS daily_income (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  shop_id    VARCHAR(36)   NOT NULL COMMENT '关联 shops.id',
  date       DATE          NOT NULL COMMENT '收入日期',
  platform   VARCHAR(50)   NOT NULL COMMENT '平台名称',
  amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_date_platform (shop_id, date, platform),
  KEY idx_shop_date (shop_id, date),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日收入表';

-- 5. 支出表
CREATE TABLE IF NOT EXISTS expenses (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  shop_id    VARCHAR(36)   NOT NULL COMMENT '关联 shops.id',
  date       DATE          NOT NULL COMMENT '支出日期',
  category   VARCHAR(50)   NOT NULL COMMENT '支出类别',
  amount     DECIMAL(10,2) NOT NULL COMMENT '支出金额',
  note       VARCHAR(200)  NOT NULL COMMENT '备注（必填）',
  is_auto    TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否自动生成（如房租）',
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_shop_date (shop_id, date),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支出表';
