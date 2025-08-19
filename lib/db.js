// lib/db.js
import mongoose from 'mongoose'

// استخدم 127.0.0.1 كافتراضي لتفادي مشاكل IPv6
const DEFAULT_URI = 'mongodb://127.0.0.1:27017/conference'
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI
const DB_NAME     = process.env.MONGODB_DB || undefined // اختياري: إن URI بدون اسم DB

// إعدادات معقولة
mongoose.set('strictQuery', true)
mongoose.set('bufferCommands', false)

// كاش عالمي أثناء dev/hot-reload
let cached = global._mongoose
if (!cached) cached = (global._mongoose = { conn: null, promise: null })

export async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      retryWrites: true,
      dbName: DB_NAME, // يُتجاهل إن كان الاسم موجودًا في الـ URI
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}

/**
 * تُعيد كائن الـ Db الأصلي من درايفر MongoDB،
 * بحيث يبقى الكود القديم يعمل:  const db = await getDb(); db.collection('attendees')...
 */
export async function getDb() {
  try {
    await dbConnect()
    const db = mongoose.connection.db
    await db.command({ ping: 1 })
    return db
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const err = new Error('db_unavailable: ' + msg)
    err.cause = e
    throw err
  }
}

// مساعد اختياري: احصل على كولكشن مباشرة
export async function getCollection(name) {
  const db = await getDb()
  return db.collection(name)
}

// مهم: توافُق مع الاستيرادات القديمة مثل "import db from '@/lib/db'"
export default dbConnect
