# My Trade - Trading Journal Setup Guide

## ภาพรวมระบบ My Trade

ระบบ My Trade เป็นบันทึกการเทรดแบบครบครันที่พัฒนาด้วย Next.js, TypeScript และ Supabase มีฟีเจอร์ดังนี้:

### ✨ ฟีเจอร์หลัก
- 📝 **บันทึกการเทรด** - บันทึกรายละเอียดครบถ้วน (ราคา, ปริมาณ, Stop Loss, Take Profit)
- 📊 **สถิติการเทรด** - Win Rate, P&L, Profit Factor, Max Drawdown
- 🔍 **ค้นหาและฟิลเตอร์** - ตามสัญลักษณ์, กลยุทธ์, สถานะ, ช่วงเวลา
- 🏷️ **แท็กและหมวดหมู่** - จัดระเบียบการเทรดง่ายขึ้น
- 📈 **วิเคราะห์ตามสินทรัพย์** - ดูผลงานแยกตามประเภท
- 📱 **Responsive Design** - ใช้งานได้บนมือถือและ Desktop

## 🚀 ขั้นตอนการตั้งค่า

### 1. ตั้งค่า Supabase Database

1.1 **สร้าง Project ใหม่ใน Supabase**
- เข้าไปที่ [supabase.com](https://supabase.com)
- สร้าง project ใหม่
- คัดลอก `Project URL` และ `anon key`

1.2 **รัน SQL Migration**
```sql
-- รันไฟล์ SQL จาก supabase/migrations/20240101000001_create_trades_table.sql
-- หรือรันคำสั่ง SQL ด้านล่างใน Supabase SQL Editor

-- Create single trades table (simplified)
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic trade information
    trade_date TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'forex', 'commodity', 'index')),

    -- Trade type and strategy
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    strategy VARCHAR(100),
    setup_type VARCHAR(50),

    -- Price and quantity
    entry_price DECIMAL(15,8) NOT NULL,
    exit_price DECIMAL(15,8),
    quantity DECIMAL(20,8) NOT NULL,
    position_size DECIMAL(20,2),

    -- Risk and profit
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    risk_amount DECIMAL(20,2),
    profit_loss DECIMAL(20,2),
    profit_loss_percent DECIMAL(10,4),

    -- Status and result
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'partial')),
    exit_reason VARCHAR(100),

    -- Notes and attachments
    notes TEXT,
    tags TEXT[], -- array of tags for filtering
    screenshot_url TEXT,

    -- Account info stored directly in trades table
    account_name VARCHAR(100),
    broker VARCHAR(100),
    account_type VARCHAR(20) CHECK (account_type IN ('demo', 'live')),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_asset_type ON trades(asset_type);
CREATE INDEX IF NOT EXISTS idx_trades_tags ON trades USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trades
CREATE POLICY "Users can view own trades" ON trades
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trades table
CREATE TRIGGER handle_trades_updated_at
    BEFORE UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ใน root project:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. ตั้งค่า Authentication

ใน Supabase Dashboard:
1. ไปที่ `Authentication` > `Settings`
2. เปิดใช้งาน `Enable email confirmations` ตามต้องการ
3. ตั้งค่า `Site URL` เป็น `http://localhost:3000` (สำหรับ development)

### 4. รันโปรเจค

```bash
npm install
npm run dev
```

### 5. การเข้าถึงระบบ

- เข้าไปที่ `http://localhost:3000/dashboard/my-trade`
- ต้อง Login ก่อนถึงจะใช้งานได้

## 📋 คู่มือการใช้งาน

### การบันทึกการเทรด
1. คลิกปุ่ม "บันทึกการเทรด"
2. กรอกข้อมูลพื้นฐาน:
   - วันที่เทรด
   - สัญลักษณ์ (เช่น BTC/USD, AAPL)
   - ประเภทสินทรัพย์ (หุ้น, คริปโต, Forex, etc.)
   - ประเภทการเทรด (Buy/Sell)
3. กรอกข้อมูลกลยุทธ์:
   - กลยุทธ์ที่ใช้
   - รูปแบบเข้าเทรด (ถ้ามี)
4. กรอกราคาและปริมาณ:
   - ราคาเข้า/ออก
   - ปริมาณ
   - Stop Loss / Take Profit
5. เพิ่มข้อมูลเพิ่มเติม:
   - โน๊ต
   - แท็ก
   - ลิงก์รูปภาพ
6. บันทึก

### การดูสถิติ
- Tab "ภาพรวม" แสดงสถิติหลัก
- Win Rate, P&L, Profit Factor
- สถิติตามประเภทสินทรัพย์

### การจัดการรายการ
- Tab "รายการเทรด" แสดงรายการทั้งหมด
- ใช้ฟิลเตอร์ตามสัญลักษณ์, สถานะ, กลยุทธ์
- ค้นหาด้วย keyword
- ดูรายละเอียด, แก้ไข, ลบรายการ

## 🛠️ โครงสร้างโปรเจค

```
/components/trading/
  ├── trade-form.tsx      # ฟอร์มบันทึกการเทรด
  ├── trade-list.tsx      # รายการการเทรด
  └── trade-stats.tsx     # สถิติการเทรด

/types/trading.ts         # TypeScript types
/lib/trading.ts          # Supabase functions
/supabase/migrations/    # Database migrations
/app/dashboard/my-trade/ # Pages
```

**ปรับเปลี่ยนล่าสุด:**
- ✅ ใช้เพียง 1 table `trades` แทนการใช้หลาย table
- ✅ ข้อมูลบัญชี (account_name, broker, account_type, currency) จัดเก็บใน table เดียวกัน
- ✅ ลบ tables: `trading_accounts` และ `trade_attachments`
- ✅ ปรับปรุงฟิลเตอร์ให้ค้นหาจากข้อมูลบัญชีได้

## 🔧 การปรับแต่ง

### เพิ่มประเภทสินทรัพย์
แก้ไขใน `types/trading.ts` และ database schema

### เพิ่มกลยุทธ์
แก้ไขใน `trade-form.tsx` ตัวแปร `commonStrategies`

### ปรับแต่ง UI
แก้ไข Tailwind CSS classes ใน components

## 🐛 การแก้ไขปัญหาทั่วไป

### "ไม่สามารถเชื่อมต่อ Supabase"
- ตรวจสอบ Environment Variables
- ตรวจสอบ URL และ API Key

### "Permission denied"
- ตรวจสอบ RLS policies
- ตรวจสอบการ login

### "Data not showing"
- ตรวจสอบว่ามีข้อมูลใน database
- ตรวจสอบ filters และ search terms

## 📝 แผนพัฒนาต่อ

- [ ] กราฟ P&L แบบ interactive
- [ ] ส่งออกข้อมูลเป็น CSV/PDF
- [ ] อัปโหลดรูปภาพโดยตรง
- [ ] การแจ้งเตือน
- [ ] Mobile App
- [ ] บูรณาการกับ Broker APIs

## 🆘 การขอความช่วยเหลือ

หากพบปัญหา:
1. ตรวจสอบ console logs
2. ตรวจสอบ Supabase logs
3. ตรวจสอบ network requests
4. สร้าง issue ใน repository

---

**พัฒนาด้วย ❤️ สำหรับนักเทรดชาวไทย**