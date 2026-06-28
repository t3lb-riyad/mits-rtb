# Audit Report — LA MAISON CD

## 1. Price Filter (New)

### Implementation

| Aspect | File | Line(s) | Detail |
|--------|------|---------|--------|
| Threshold definition | `frontend/src/pages/HomePage.tsx` | 8 | `const PRICE_OPTIONS = [20000, 40000, 60000, 80000, 100000, 200000, 500000]` |
| State variable | `frontend/src/pages/HomePage.tsx` | 24 | `const [filterPrice, setFilterPrice] = useState('')` |
| Filter logic (client-side) | `frontend/src/pages/HomePage.tsx` | 75–78 | `.filter(p => !filterPrice \|\| Number(p.base_price) < Number(filterPrice))` |
| Dropdown UI | `frontend/src/pages/HomePage.tsx` | 216–221 | `<select>` mapped from `PRICE_OPTIONS` |
| Clear filter | `frontend/src/pages/HomePage.tsx` | 222–224 | Resets `filterPrice` alongside brand/RAM/storage |
| Translations | `frontend/src/i18n/translations.ts` | en:24–25, ar:24–25, fr:24–25 | Label + `< {0} DA` / `أقل من {0} د.ج` template |

### How to update price thresholds

**Currently** — Edit the `PRICE_OPTIONS` array on **line 8 of `frontend/src/pages/HomePage.tsx`**. Add, remove, or reorder numbers as needed. The dropdown and filter logic adapt automatically.

**To move to a config file** — Create `frontend/src/config/prices.ts`:

```ts
export const PRICE_OPTIONS = [20000, 40000, 60000, 80000, 100000, 200000, 500000];
```

Then change line 7–8 of `HomePage.tsx` from:

```ts
const PRICE_OPTIONS = [20000, ...];
```

to:

```ts
import { PRICE_OPTIONS } from '../config/prices';
```

No other changes needed — the component only references the constant by name.

---

## 2. Full System Inventory — Hardcoded & Configurable Strings

| Category | What | Where to edit | Type |
|----------|------|---------------|------|
| **WhatsApp number** | WhatsApp link on product pages | `frontend/.env` → `VITE_WHATSAPP_NUMBER` | Environment |
| **Phone number** | Call link on product pages | `frontend/.env` → `VITE_PHONE_NUMBER` | Environment |
| **API base URL** | Backend connection | `frontend/.env` → `VITE_API_BASE` | Environment |
| **Database connection** | PostgreSQL/Supabase pool | `backend/models/database.js:4` — `DATABASE_URL` or env var | Environment |
| **Brand** | LA MAISON CD | `frontend/src/i18n/translations.ts` — `site.name` (3 langs) | Translation |
| **Tagline** | Store tagline | `frontend/src/i18n/translations.ts` — `site.tagline` (3 langs) | Translation |
| **Footer phone** | Phone line in footer | `frontend/src/i18n/translations.ts` — `footer.phone_line` (3 langs) | Translation |
| **Footer email** | Email line in footer | `frontend/src/i18n/translations.ts` — `footer.email_line` (3 langs) | Translation |
| **Footer copyright** | Copyright text | `frontend/src/i18n/translations.ts` — `footer.copyright` (3 langs) | Translation |
| **Footer location** | Location text | `frontend/src/i18n/translations.ts` — `footer.location` (3 langs) | Translation |
| **Footer "created by"** | Credit prefix + suffix | `frontend/src/i18n/translations.ts` — `footer.created_by_prefix` / `footer.created_by_suffix` (3 langs) | Translation |
| **Hero title/desc** | Homepage hero banner | `frontend/src/i18n/translations.ts` — `home.hero.*` (3 langs) | Translation |
| **Features** | 3 feature cards | `frontend/src/i18n/translations.ts` — `home.feature*.*` (3 langs) | Translation |
| **Best Of labels** | Study / Work / Gaming | `frontend/src/i18n/translations.ts` — `home.best_of_*` (3 langs) | Translation |
| **Filter: Brand / RAM / Storage / Price** | Dropdown labels + price template | `frontend/src/i18n/translations.ts` — `home.filter_*`, `home.price_option` (3 langs) | Translation |
| **Clear Filters** | Button text | `frontend/src/i18n/translations.ts` — `home.filter_clear` (3 langs) | Translation |
| **Product page** | All labels, validation msgs, placeholders | `frontend/src/i18n/translations.ts` — `product.*` (3 langs) | Translation |
| **Cart** | All labels, bulk discount text, hints | `frontend/src/i18n/translations.ts` — `cart.*` (3 langs) | Translation |
| **Exchange** | All labels, validation msgs | `frontend/src/i18n/translations.ts` — `exchange.*` (3 langs) | Translation |
| **Loading** | Spinner text | `frontend/src/i18n/translations.ts` — `loading` (3 langs) | Translation |
| **Nav links** | Store / Exchange labels | `frontend/src/i18n/translations.ts` — `nav.*` (3 langs) | Translation |
| **Footer quick links** | Home / Exchange / Contact labels | `frontend/src/i18n/translations.ts` — `footer.*` (3 langs) | Translation |
| **Best Of default** | Which category shows in Best Of section | `frontend/src/pages/HomePage.tsx:18` — `useState('study')` | Code (constant) |
| **Price filter thresholds** | 20k/40k/60k/80k/100k/200k/500k DA | `frontend/src/pages/HomePage.tsx:8` — `PRICE_OPTIONS` array | Code (constant) |
| **Page size** | Products per page | `frontend/src/pages/HomePage.tsx:27` — `PAGE_SIZE = 10` | Code (constant) |
| **Discount tiers** | 5+ / 10+ piece thresholds | `backend/routes/orders.js` — `quantity >= 10` / `quantity >= 5` | Code (business rule) |
| **Discount percentages** | Per-product discount tiers (stored in DB) | `products` table: `discount_tier1_percent`, `discount_tier2_percent` | Database |
| **Admin login** | Credentials | `backend/server.js` — `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Code (hardcoded) |
| **Colors** | Primary `#22549E`, Accent `#FDF05`, Dark `#22549E`, Light `#FFF4EB`, Heading `#3D1534` | CSS custom properties + inline styles across `frontend/src/styles/index.css` and various components | Code (hardcoded) |

---

## 3. Key Design Decisions

- **All contact details** are split: WhatsApp/Call numbers live in `frontend/.env`, footer phone/email live in `translations.ts`. No source code changes needed to update any contact info.
- **Discount** is per-product (columns on `products` table), not global. Thresholds are code constants (5+/10+). Percentages are per-product DB values.
- **Price filter** is 100% client-side — no backend changes needed. Thresholds are a constant array at the top of `HomePage.tsx`.
- **All prices use `Number()`** at every PostgreSQL read boundary to prevent NaN from string concatenation.
- **No routing library** in admin (`admin/src/main.tsx` uses React state, not `BrowserRouter`).
