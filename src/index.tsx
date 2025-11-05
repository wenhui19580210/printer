import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './' }))

// ==================== API Routes ====================

// 物件一覧取得
app.get('/api/properties', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare(`
    SELECT * FROM properties ORDER BY id DESC
  `).all()
  return c.json(results)
})

// 物件詳細取得
app.get('/api/properties/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const property = await db.prepare(`
    SELECT * FROM properties WHERE id = ?
  `).bind(id).first()
  
  if (!property) {
    return c.json({ error: 'Property not found' }, 404)
  }
  return c.json(property)
})

// 物件作成
app.post('/api/properties', async (c) => {
  const db = c.env.DB
  const { name, address } = await c.req.json()
  
  const result = await db.prepare(`
    INSERT INTO properties (name, address) VALUES (?, ?)
  `).bind(name, address).run()
  
  return c.json({ id: result.meta.last_row_id, name, address })
})

// 物件更新
app.put('/api/properties/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { name, address } = await c.req.json()
  
  await db.prepare(`
    UPDATE properties SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(name, address, id).run()
  
  return c.json({ id, name, address })
})

// 物件削除
app.delete('/api/properties/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  await db.prepare(`DELETE FROM properties WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ==================== 部屋 API ====================

// 物件の部屋一覧取得
app.get('/api/properties/:propertyId/rooms', async (c) => {
  const db = c.env.DB
  const propertyId = c.req.param('propertyId')
  const { results } = await db.prepare(`
    SELECT * FROM rooms WHERE property_id = ? ORDER BY room_number
  `).bind(propertyId).all()
  return c.json(results)
})

// 部屋作成
app.post('/api/rooms', async (c) => {
  const db = c.env.DB
  const { property_id, room_number, floor } = await c.req.json()
  
  const result = await db.prepare(`
    INSERT INTO rooms (property_id, room_number, floor) VALUES (?, ?, ?)
  `).bind(property_id, room_number, floor).run()
  
  return c.json({ id: result.meta.last_row_id, property_id, room_number, floor })
})

// 部屋更新
app.put('/api/rooms/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { room_number, floor } = await c.req.json()
  
  await db.prepare(`
    UPDATE rooms SET room_number = ?, floor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(room_number, floor, id).run()
  
  return c.json({ id, room_number, floor })
})

// 部屋削除
app.delete('/api/rooms/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  await db.prepare(`DELETE FROM rooms WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ==================== 契約 API ====================

// 部屋の契約一覧取得
app.get('/api/rooms/:roomId/contracts', async (c) => {
  const db = c.env.DB
  const roomId = c.req.param('roomId')
  const { results } = await db.prepare(`
    SELECT * FROM contracts WHERE room_id = ? ORDER BY created_at DESC
  `).bind(roomId).all()
  return c.json(results)
})

// 有効な契約一覧取得（物件ID指定）
app.get('/api/properties/:propertyId/active-contracts', async (c) => {
  const db = c.env.DB
  const propertyId = c.req.param('propertyId')
  const { results } = await db.prepare(`
    SELECT c.*, r.room_number, r.floor 
    FROM contracts c
    JOIN rooms r ON c.room_id = r.id
    WHERE r.property_id = ? AND c.is_active = 1
    ORDER BY r.room_number
  `).bind(propertyId).all()
  return c.json(results)
})

// 契約作成
app.post('/api/contracts', async (c) => {
  const db = c.env.DB
  const { room_id, contractor_name, tenant_name, rent, management_fee, parking_fee, other_fee, start_date, end_date, is_active } = await c.req.json()
  
  const result = await db.prepare(`
    INSERT INTO contracts (room_id, contractor_name, tenant_name, rent, management_fee, parking_fee, other_fee, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(room_id, contractor_name, tenant_name || null, rent, management_fee, parking_fee, other_fee, start_date, end_date || null, is_active).run()
  
  return c.json({ id: result.meta.last_row_id })
})

// 契約更新
app.put('/api/contracts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { contractor_name, tenant_name, rent, management_fee, parking_fee, other_fee, start_date, end_date, is_active } = await c.req.json()
  
  await db.prepare(`
    UPDATE contracts 
    SET contractor_name = ?, tenant_name = ?, rent = ?, management_fee = ?, parking_fee = ?, other_fee = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(contractor_name, tenant_name || null, rent, management_fee, parking_fee, other_fee, start_date, end_date || null, is_active, id).run()
  
  return c.json({ success: true })
})

// 契約削除
app.delete('/api/contracts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  await db.prepare(`DELETE FROM contracts WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ==================== 支出 API ====================

// 物件の支出一覧取得（年月指定）
app.get('/api/properties/:propertyId/expenses', async (c) => {
  const db = c.env.DB
  const propertyId = c.req.param('propertyId')
  const yearMonth = c.req.query('year_month')
  
  let query = `SELECT * FROM expenses WHERE property_id = ?`
  const params = [propertyId]
  
  if (yearMonth) {
    query += ` AND year_month = ?`
    params.push(yearMonth)
  }
  
  query += ` ORDER BY created_at DESC`
  
  const { results } = await db.prepare(query).bind(...params).all()
  return c.json(results)
})

// 支出作成
app.post('/api/expenses', async (c) => {
  const db = c.env.DB
  const { property_id, year_month, item_name, description, amount, tax, total } = await c.req.json()
  
  const result = await db.prepare(`
    INSERT INTO expenses (property_id, year_month, item_name, description, amount, tax, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(property_id, year_month, item_name, description || null, amount, tax, total).run()
  
  return c.json({ id: result.meta.last_row_id })
})

// 支出更新
app.put('/api/expenses/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { item_name, description, amount, tax, total } = await c.req.json()
  
  await db.prepare(`
    UPDATE expenses 
    SET item_name = ?, description = ?, amount = ?, tax = ?, total = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(item_name, description || null, amount, tax, total, id).run()
  
  return c.json({ success: true })
})

// 支出削除
app.delete('/api/expenses/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  await db.prepare(`DELETE FROM expenses WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ==================== 月次報告書 API ====================

// 月次報告書データ取得
app.get('/api/properties/:propertyId/report', async (c) => {
  const db = c.env.DB
  const propertyId = c.req.param('propertyId')
  const yearMonth = c.req.query('year_month') || new Date().toISOString().slice(0, 7)
  
  // 物件情報取得
  const property = await db.prepare(`
    SELECT * FROM properties WHERE id = ?
  `).bind(propertyId).first()
  
  if (!property) {
    return c.json({ error: 'Property not found' }, 404)
  }
  
  // 収入データ取得（有効な契約）
  const { results: contracts } = await db.prepare(`
    SELECT c.*, r.room_number, r.floor 
    FROM contracts c
    JOIN rooms r ON c.room_id = r.id
    WHERE r.property_id = ? AND c.is_active = 1
    ORDER BY r.room_number
  `).bind(propertyId).all()
  
  // 支出データ取得
  const { results: expenses } = await db.prepare(`
    SELECT * FROM expenses WHERE property_id = ? AND year_month = ?
    ORDER BY created_at
  `).bind(propertyId, yearMonth).all()
  
  // 合計計算
  const totalIncome = contracts.reduce((sum: number, c: any) => sum + (c.rent || 0) + (c.management_fee || 0) + (c.parking_fee || 0) + (c.other_fee || 0), 0)
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + (e.total || 0), 0)
  const netIncome = totalIncome - totalExpense
  
  return c.json({
    property,
    year_month: yearMonth,
    report_date: new Date().toISOString().split('T')[0],
    contracts,
    expenses,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_income: netIncome
  })
})

// ==================== デフォルトルート ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>不動産月次収支報告書システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
