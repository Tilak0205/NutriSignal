# NutriSignal — Functionality Reference

Every feature currently built, organized by user role.

---

## 1. Super Admin

The platform owner who manages all restaurants and subscription plans.

### 1.1 Bootstrap (One-time Setup)

- **Route**: `/bootstrap-super-admin`
- **API**: `POST /api/auth/bootstrap-super-admin`
- **What it does**: Creates the first super admin account using a secret bootstrap key from the environment variable `ADMIN_BOOTSTRAP_KEY`. Blocked if a super admin already exists.
- **Fields**: Admin name, email, password, bootstrap key.

### 1.2 Dashboard (`/super-admin`)

#### Analytics Cards
- Total restaurants on the platform
- Total orders across all restaurants
- Total active customer sessions
- Mood distribution (positive / negative / neutral) via grouped query

#### Restaurant Management
- **View**: List of all restaurants with name, active status, and subscription plan
- **Add**: Create a new restaurant by name (with validation — cannot add empty names)
- **Edit**: Inline rename a restaurant
- **Activate/Deactivate**: Toggle a restaurant's active status
- **Delete**: Remove a restaurant entirely (with confirmation)

#### Subscription Plan Management
- **View**: All plans displayed as cards showing name, price/month, and max tables
- **Add**: Create a plan with name, price, and max tables
- **Edit**: Inline edit plan details (name, price, max tables)

### 1.3 API Endpoints

| Method | Endpoint                    | Description                         |
|--------|-----------------------------|-------------------------------------|
| GET    | `/api/admin/analytics`      | Platform-wide counts and mood distribution |
| GET    | `/api/admin/restaurants`    | All restaurants with subscription info |
| POST   | `/api/admin/restaurants`    | Create a restaurant                 |
| PUT    | `/api/admin/restaurants/:id`| Update restaurant name/status       |
| DELETE | `/api/admin/restaurants/:id`| Delete a restaurant                 |
| GET    | `/api/admin/subscriptions`  | All subscription plans              |
| POST   | `/api/admin/subscriptions`  | Create a subscription plan          |
| PUT    | `/api/admin/subscriptions/:id` | Update a subscription plan       |

---

## 2. Restaurant Admin (Owner / Manager / Staff)

Restaurant owners and staff manage their restaurant's menu, tables, and monitor customer interactions.

### 2.1 Registration & Login

- **Register** (`/register`): Provide your name, email, password, and restaurant name. This creates both the restaurant entity and your owner account. Returns a JWT token.
- **Login** (`/login`): Email + password authentication. Returns JWT with role and restaurantId.

### 2.2 Dashboard (`/dashboard`)

The restaurant dashboard has a **sidebar navigation** (desktop) / **bottom tab bar** (mobile) with six sections:

#### Overview Tab
- **Stats grid**: 6 cards showing orders count, pending orders, AI insights count, menu items, tables, and average rating
- **Profile card**: View/edit restaurant profile:
  - Restaurant name
  - Description
  - Address and phone
  - Brand primary and secondary colors (color pickers)

#### Menu Tab
- **Add Category**: Text input to create a new menu category (e.g., "Starters", "Biryani", "Drinks")
- **Add Item**: Expandable form with item name, price, description, and category selector
- **Category cards**: Each category shows its items with:
  - Item name and price
  - Visibility toggle (eye icon) — hide/show items without deleting
  - Delete button for individual items
  - Delete button for entire category (cascades to all items)
- **Validation**: Cannot add items without a name, price > 0, or category selection

#### Tables & QR Tab
- **Add Table**: Specify a table number and create it
- **Table grid**: Each table displayed as a card with:
  - Table number prominently displayed
  - "QR" button to generate and display QR code
  - "Delete" button to remove the table
- **QR Display**: When clicked, shows:
  - QR code image (data URI)
  - The full URL the QR encodes (`{CLIENT_URL}/t/{uuid}`)
  - Instructions to print and place on table

#### Insights Tab (AI Mood Analysis)
- **Insight cards**: Each customer questionnaire generates an insight card showing:
  - Table number and timestamp
  - Sentiment badge (color-coded: green = positive, red = negative, amber = neutral)
  - Service approach description (AI-generated summary of how to interact)
  - Interaction tips (bulleted AI-generated actionable advice)
- Cards are sorted newest-first

#### Orders Tab
- **Order cards**: Each order shows:
  - Table number and status badge (PENDING/PREPARING/SERVED/COMPLETED)
  - Total amount
  - Line items with quantities and subtotals
  - Optional customer notes
  - Timestamp
  - **Status dropdown**: Hover to reveal status options, click to update
- Pending orders badge shown in sidebar navigation

#### Feedback Tab
- **Aggregate rating**: Large number display with star visualization and trend indicator (Excellent/Good/Needs improvement)
- **Individual feedback cards**: Star rating, comment text, and timestamp
- Total response count

### 2.3 API Endpoints

| Method | Endpoint                             | Description                          |
|--------|--------------------------------------|--------------------------------------|
| GET    | `/api/restaurant/profile`            | Get restaurant profile               |
| PUT    | `/api/restaurant/profile`            | Update profile fields                |
| GET    | `/api/restaurant/menu/categories`    | Categories with items                |
| POST   | `/api/restaurant/menu/categories`    | Create category                      |
| PUT    | `/api/restaurant/menu/categories/:id`| Update category                      |
| DELETE | `/api/restaurant/menu/categories/:id`| Delete category + items              |
| POST   | `/api/restaurant/menu/items`         | Create menu item                     |
| PUT    | `/api/restaurant/menu/items/:id`     | Update item (name, price, visibility)|
| DELETE | `/api/restaurant/menu/items/:id`     | Delete item                          |
| GET    | `/api/restaurant/tables`             | List all tables                      |
| POST   | `/api/restaurant/tables`             | Create table with auto QR UUID       |
| DELETE | `/api/restaurant/tables/:id`         | Delete table                         |
| GET    | `/api/restaurant/tables/:id/qr`      | Generate QR code data URI + URL      |
| GET    | `/api/restaurant/mood-insights`      | All mood analyses for restaurant     |
| GET    | `/api/restaurant/mood-insights/history` | Filtered by date range (from/to)  |
| GET    | `/api/restaurant/orders`             | Orders with items and table info     |
| PUT    | `/api/restaurant/orders/:id/status`  | Update order status                  |
| GET    | `/api/restaurant/feedbacks`          | All customer feedback                |

---

## 3. Customer Flow

Customers interact with NutriSignal by scanning a QR code at their table. No account or login required.

### 3.1 Flow Steps

```
QR Scan → Welcome → Questionnaire (6 steps) → Menu → Order → Feedback → Thank You
```

#### Step 1: QR Scan & Welcome
- Customer scans the QR code on their table
- App resolves the table UUID to get restaurant branding (name, colors, logo)
- A new customer session is created server-side
- Welcome screen shows restaurant name, branded icon, and "Let's Go" button

#### Step 2: Mood Questionnaire (6 questions)
Each question is a full-screen step with animated emoji chips:

| # | Question            | Options                                         |
|---|--------------------|-------------------------------------------------|
| 1 | How are you feeling? | Great 😊, Good 😌, Okay 😐, Tired 😫, Stressed 😰 |
| 2 | What's your mood?  | Happy 😄, Relaxed 🧘, Excited 🤩, Sad 😢, Anxious 😰, Neutral 😐 |
| 3 | Any cravings?      | Sweet 🍰, Savory 🥩, Spicy 🌶️, Light 🥗, Heavy 🍖, Comfort 🍲 |
| 4 | Energy level?      | Low 🔋, Medium ⚡, High 🔥                     |
| 5 | What's the occasion? | Casual ☕, Celebration 🎉, Date 💕, Business 💼, Family 👨‍👩‍👧‍👦 |
| 6 | Dietary preference? | None 🍽️, Vegetarian 🥬, Vegan 🌱, Gluten-free 🌾 |

- Progress bar shows completion across all 6 steps
- Back/Next navigation with validation (must select an option)
- On final submit: questionnaire is saved, AI mood analysis runs, session moves to MENU status

#### Step 3: Menu
- Menu categories displayed as sections with uppercase headers
- Each item shows name, description, and price
- Add to cart with + button; adjust quantity with +/- controls
- Floating bottom bar appears when cart has items, showing item count and total price
- "Place Order" button submits the order

#### Step 4: Feedback
- Celebration animation ("Order placed!")
- 5-star rating with hover/tap animation
- Optional text comment
- Can skip feedback entirely

#### Step 5: Thank You
- Animated party popper icon
- Thank you message with table number and restaurant name
- Session status set to COMPLETED

### 3.2 API Endpoints

| Method | Endpoint                           | Description                           |
|--------|------------------------------------|---------------------------------------|
| GET    | `/api/customer/table/:uuid`        | Resolve QR UUID to table + restaurant |
| POST   | `/api/customer/session`            | Create customer session               |
| POST   | `/api/customer/questionnaire`      | Submit answers + trigger AI analysis  |
| GET    | `/api/customer/menu/:restaurantId` | Get menu categories and items         |
| POST   | `/api/customer/order`              | Place order with item quantities      |
| POST   | `/api/customer/feedback`           | Submit rating and comment             |

---

## 4. AI Mood Analysis

### What it Does
When a customer submits the questionnaire, the AI analyzes their responses and generates:

1. **Sentiment**: `positive`, `negative`, or `neutral`
2. **Key Insights**: Array of observations about the customer's state (e.g., "Customer is feeling stressed and tired")
3. **Interaction Tips**: Actionable advice for staff (e.g., "Approach with a calm, empathetic tone")
4. **Service Approach**: A paragraph-length description of the recommended service strategy

### Where it Appears
- **Restaurant Dashboard → Insights Tab**: Staff sees all mood analyses ordered by most recent
- Cards are color-coded by sentiment (green border for positive, red for negative, amber for neutral)

### Provider Configuration

| Env Variable   | Value      | Effect                        |
|----------------|------------|-------------------------------|
| `AI_PROVIDER`  | `grok`     | Uses Grok X API (grok-3-mini) |
| `AI_PROVIDER`  | `claude`   | Uses Anthropic Claude API     |
| `AI_API_KEY`   | (any key)  | Sent as Bearer/x-api-key      |
| `AI_API_KEY`   | (empty)    | Falls back to rule-based      |

---

## 5. Authentication Flows

### Login
1. User enters email + password on `/login`
2. Frontend POSTs to `/api/auth/login`
3. Backend validates with bcrypt, returns JWT + user object
4. Frontend stores token and role in localStorage
5. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
6. Frontend redirects to `/super-admin` (if SUPER_ADMIN) or `/dashboard` (if OWNER/MANAGER/STAFF)

### Registration
1. User enters name, email, password, restaurant name on `/register`
2. Backend creates Restaurant + OWNER user, returns JWT
3. Frontend stores token/role and redirects to `/dashboard`

### Route Protection
- `RequireRole` component checks localStorage for token and role
- Missing token → redirect to `/login`
- Wrong role → redirect to `/`
- Backend middleware double-checks JWT validity and role on every API call

---

## 6. Current Data in the System

Based on E2E testing, the database contains:

| Entity              | Count | Details                              |
|---------------------|-------|--------------------------------------|
| Restaurants         | 2     | Paradise, Pista House                |
| Users               | 3     | 1 Super Admin, 2 Restaurant owners   |
| Menu Categories     | 3     | Starters, Biryani, Drinks            |
| Menu Items          | 5     | Mirchi Bajji, Double Ka Meetha, Chicken/Mutton Biryani, Irani Chai |
| Tables              | 2     | Table 1, Table 2                     |
| Customer Sessions   | 5     | Multiple test sessions               |
| Mood Analyses       | 4     | 3 positive, 1 negative               |
| Orders              | 4     | Various items and statuses           |
| Feedbacks           | 3     | Average rating: 4.7 stars            |
