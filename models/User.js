// models/User.js
import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  email: { type:String, required:true, unique:true, index:true },
  role:  { type:String, default:'staff' },
  roles: { type:[String], default:['staff'] },
  passwordHash: String,
  password: String,
}, { timestamps:true }
)

// فهرس فريد صريح (في حال تغييرات سابقة)
UserSchema.index({ email: 1 }, { unique: true })

// منع OverwriteModelError في التطوير
export default mongoose.models.User || mongoose.model('User', UserSchema)
