# Loading Components Usage

## ตัวอย่างการใช้งาน Loading Components

### 1. Basic Loading
```tsx
import { Loading } from "@/components/ui/loading"

<Loading size="md" text="กำลังโหลด..." variant="spinner" />
```

### 2. Button Loading
```tsx
import { ButtonLoading } from "@/components/ui/loading"

<Button isLoading>
  {isLoading ? <ButtonLoading text="กำลังบันทึก..." /> : "บันทึก"}
</Button>
```

### 3. Full Screen Loading
```tsx
import { Loading } from "@/components/ui/loading"

<Loading
  size="xl"
  text="กำลังประมวลผล..."
  fullScreen
  variant="dots"
/>
```

### 4. Card Loading
```tsx
import { CardLoading } from "@/components/ui/loading"

<CardLoading title="กำลังโหลดข้อมูล..." />
```

### 5. Table Loading
```tsx
import { TableLoading } from "@/components/ui/loading"

<TableLoading rows={10} />
```

### 6. Hook สำหรับจัดการ Loading State
```tsx
import { useLoading } from "@/components/ui/loading"

function MyComponent() {
  const { isLoading, startLoading, stopLoading } = useLoading()

  const handleSubmit = async () => {
    startLoading()
    try {
      await doSomething()
    } finally {
      stopLoading()
    }
  }

  return (
    <Button onClick={handleSubmit} disabled={isLoading}>
      {isLoading ? <Loading size="sm" /> : "ส่ง"}
    </Button>
  )
}
```

## Variants ที่มีให้

- `spinner` - วงกลมหมุน (default)
- `dots` - จุด 3 จุดกระโดด
- `pulse` - สี่เหลี่ยมพัลซ์
- `skeleton` - กรอดสี่เหลี่ยม

## Sizes ที่มีให้

- `sm` - เล็ก
- `md` - กลาง (default)
- `lg` - ใหญ่
- `xl` - ใหญ่พิเศษ

## Route-level Loading

Next.js จะใช้ `loading.tsx` โดยอัตโนมัติเมื่อมีไฟล์อยู่ใน route:

- `app/loading.tsx` - สำหรับทั้ง app
- `app/dashboard/loading.tsx` - สำหรับ dashboard route
- `app/dashboard/api-scheduler/loading.tsx` - สำหรับ API Scheduler page