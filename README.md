<div dir="rtl">

# تراز — حساب‌وکتاب بیماران

وب‌اپ تک‌کاربره (PWA) برای پیگیری مانده حساب بیماران، جایگزین فایل اکسل «حسابرسی - پذیرش».
برای آیفون طراحی شده و از Safari با **Add to Home Screen** مثل یک اپ مستقل نصب می‌شود.

## چه کاری انجام می‌دهد

- **دفتر حساب هر بیمار** با مانده لحظه‌ای؛ مثل ستون «مانده حساب» اکسل، ولی خودکار و بدون خطای دستی.
- **هر پرداخت مثل یک تراکنش بانکی**: *مبدا* (چه کسی پول را زد؛ خود بیمار یا شخص دیگر، مثلاً محمد برای درمان علی) و *مقصد* (به کدام حساب رفت؛ کارت خودتان، کارتخوان، صندوق، یا حساب شخص ثالث مثل آقای قمی).
- **پرونده‌های درمان جدا** برای هر بیمار (عمومی، ایمپلنت، ارتودنسی، لمینت …)؛ همان کاری که ردیف‌های `imp` در اکسل می‌کردند.
- **چک‌ها**: چک تا وقتی وصول نشده از بدهی کم نمی‌شود، سررسیدها در صفحه «چک‌ها» دیده می‌شوند و با یک لمس «وصول شد» یا «برگشت خورد» ثبت می‌شوند.
- **گزارش پایان ماه** (تقویم شمسی): مانده ابتدا و انتهای ماه هر بیمار، دریافتی به تفکیک حساب مقصد و روش پرداخت، چک‌های سررسید ماه، و خروجی اکسل.
- **حساب‌های مقصد** به شکل کارت بانکی، با جمع واریزی هر ماه.
- تخفیف و استرداد، پشتیبان کامل اکسل، ریال/تومان، تم تیره/روشن، و حالت «پنهان کردن مبالغ».
- عدد مبلغ هنگام ورود **به حروف** نوشته می‌شود و دکمه «۰۰۰» دارد؛ اشتباه‌هایی مثل `150,000,00` اکسل دیگر پیش نمی‌آید.

## تکنولوژی

| بخش | انتخاب | چرا |
| --- | --- | --- |
| Backend | Python 3.12، FastAPI، SQLAlchemy 2، Alembic، Pydantic 2 | API تایپ‌شده، مهاجرت‌های نسخه‌دار، تست ساده |
| پایگاه داده | SQLite (WAL) | تک‌کاربره؛ یک فایل، پشتیبان‌گیری با یک دستور |
| Frontend | React 19، TypeScript، Vite، Tailwind CSS 4، Motion، TanStack Query | PWA سبک با انیمیشن‌های روان روی آیفون |
| تقویم | jalaali-js / jdatetime | همه تاریخ‌ها و گزارش‌ها شمسی |
| استقرار | یک کانتینر Docker پشت Caddy پروژه patient-book | داده روی سرور خودتان می‌ماند |

مبالغ همیشه به **ریال** و به صورت عدد صحیح ذخیره می‌شوند؛ مانده هیچ‌جا ذخیره نمی‌شود و همیشه از روی تراکنش‌ها محاسبه می‌شود تا هرگز با آن‌ها ناهمخوان نشود.

## اجرای محلی

پیش‌نیاز: Python 3.12 و Node 22.

</div>

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
.venv/bin/python -m app.cli hash-password
```

<div dir="rtl">

خروجی دستور آخر (`AUTH_PASSWORD_HASH='…'`) را در `backend/.env` بگذارید، سپس:

</div>

```bash
.venv/bin/alembic upgrade head
.venv/bin/python -m app.cli seed-demo
.venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

<div dir="rtl">

برنامه روی `http://localhost:5173` باز می‌شود (Vite درخواست‌های `/api` را به پورت ۸۰۰۰ می‌فرستد). برای دیدن روی آیفون در همان شبکه، آدرس `http://<IP-مک>:5173` را باز کنید.
`seed-demo` فقط داده‌ی ساختگی برای امتحان رابط کاربری می‌سازد و فقط روی پایگاه داده‌ی خالی اجرا می‌شود.

## تست و کیفیت کد

</div>

```bash
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy app && .venv/bin/pytest
```

```bash
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

<div dir="rtl">

همین‌ها در GitHub Actions (`.github/workflows/ci.yml`) روی هر push اجرا می‌شوند، به‌علاوه‌ی ساخت image داکر.

## انتقال مانده‌ها از اکسل

برگه «لیست بدهکاران» را می‌توان یک‌بار به عنوان مانده‌ی اول دوره وارد کرد. هر ردیف یک «هزینه» با توضیح «مانده انتقالی از اکسل» می‌شود؛ ردیف‌های چک علاوه بر آن یک چک «در انتظار وصول» با همان مبلغ و سررسید می‌سازند. ردیف‌های `imp` / `ارتو` به پرونده‌ی ایمپلنت / ارتودنسی همان بیمار می‌روند.

</div>

```bash
.venv/bin/python -m app.cli import-debtors "/path/to/حسابرسی - پذیرش.xlsx" --as-of 1405-08-01 --dry-run
.venv/bin/python -m app.cli import-debtors "/path/to/حسابرسی - پذیرش.xlsx" --as-of 1405-08-01
```

<div dir="rtl">

اول با `--dry-run` اجرا کنید. اگر بیماری هم ردیف مانده‌ی ساده و هم ردیف چک داشته باشد، شماره‌ی ردیف‌ها برای بازبینی چاپ می‌شود؛ اکسل مشخص نمی‌کند چک‌ها همان مانده را پوشش می‌دهند یا اضافه بر آن هستند. روی سرور:

</div>

```bash
docker compose cp "حسابرسی - پذیرش.xlsx" taraz:/tmp/old.xlsx
docker compose exec taraz python -m app.cli import-debtors /tmp/old.xlsx --as-of 1405-08-01 --dry-run
```

<div dir="rtl">

## استقرار

راهنمای کامل در [ops/README.md](ops/README.md). خلاصه: روی همان VPS که patient-book اجرا می‌شود، در `/opt/taraz` کلون کنید، `.env` را پر کنید، `docker compose up -d --build`، و یک site block به Caddy پروژه patient-book اضافه کنید.

## ساختار پروژه

</div>

```
backend/
  app/
    models.py        جدول‌ها: بیمار، پرونده درمان، حساب مقصد، تراکنش
    services/        محاسبه مانده (ledger)، گزارش ماهانه، خروجی اکسل، ورود از اکسل
    routers/         API: auth, patients, transactions, accounts, reports
    cli.py           hash-password, backup, import-debtors, seed-demo
  alembic/           مهاجرت‌های پایگاه داده
  tests/
frontend/
  src/
    pages/           خانه، بیماران، پرونده بیمار، حساب‌ها، گزارش، چک‌ها، تنظیمات
    components/      شیت‌ها، فرم تراکنش، رسید، ورودی مبلغ، تقویم شمسی …
    lib/             API، فرمت ریال/تومان، تاریخ شمسی
ops/                 deploy.sh، backup.sh، تایمر systemd، بلوک Caddy
```
