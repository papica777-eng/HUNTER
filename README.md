# 🎯 HUNTER — VIP Telegram Бот за Бързи Обяви (OLX.bg, Mobile.bg, Imot.bg)

> Мигновени известия в Telegram при обяви под пазарната цена в OLX.bg, Mobile.bg и Imot.bg.

[![Made by AETERNA](https://img.shields.io/badge/Made%20by-AETERNA-blueviolet)](https://github.com/AETERNA-AIC)

---

## 🚀 Как работи?

1. **Сканира** OLX.bg, Mobile.bg и Imot.bg на всеки 10-30 секунди
2. **Сравнява** цената с пазарната средна (историческа + статични анкерни цени)
3. **Изпраща** мигновено известие в Telegram VIP канал при обява **20%+ под пазарната цена**
4. **Дедупликира** — всяка обява се изпраща само веднъж (SQLite WAL)

---

## 📦 Инсталация

```bash
# 1. Клониране
git clone https://github.com/papica777-eng/HUNTER.git
cd HUNTER

# 2. Инсталиране на зависимости
npm install

# 3. Конфигурация
cp .env.example .env
# Редактирай .env с твоя Telegram Bot Token и Channel ID

# 4. Стартиране
npm run dev
```

---

## ⚙️ Конфигурация (.env)

| Променлива | Описание | Default |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | — |
| `TELEGRAM_VIP_CHANNEL_ID` | ID на VIP канала | — |
| `SCAN_INTERVAL_SECONDS` | Интервал между сканиранията | `30` |
| `PRICE_DISCOUNT_THRESHOLD` | Мин. отстъпка за известие (%) | `20` |
| `OLX_ENABLED` | Активиране на OLX.bg | `true` |
| `MOBILEBG_ENABLED` | Активиране на Mobile.bg | `true` |
| `IMOTBG_ENABLED` | Активиране на Imot.bg | `true` |

---

## 🐳 Docker Deployment (Hetzner VPS)

```bash
# Build
docker build -t hunter .

# Run
docker run -d \
  --name hunter \
  --restart unless-stopped \
  -v hunter-data:/app/data \
  --env-file .env \
  hunter
```

---

## 📱 Telegram Команди

| Команда | Описание |
|---|---|
| `/start` | Добре дошли + информация |
| `/stats` | Статистика на бота |
| `/deals` | Последните 10 сделки |
| `/help` | Помощ |

---

## 💰 Ценообразуване

- **Безплатен тест:** 3 дни
- **VIP Достъп:** 29 лв/мес
- **VIP+ Персонални филтри:** 49 лв/мес

---

**Architect:** Dimitar Prodromov | **Authority:** AETERNA_LOGOS
