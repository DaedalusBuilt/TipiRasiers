/**
 * models/Volunteer.js — Volunteer model using SQLite
 */

const { v4: uuidv4 } = require('uuid');
const db             = require('../config/database');

function rowToVolunteer(row) {
  if (!row) return null;
  return {
    id:             row.id,
    name:           row.name,
    email:          row.email,
    phone:          row.phone,
    interests:      JSON.parse(row.interests || '[]'),
    skills:         row.skills,
    message:        row.message,
    availableHours: row.available_hours,
    status:         row.status,
    createdAt:      row.created_at,
  };
}

const Volunteer = {
  findAll() {
    return db.prepare('SELECT * FROM volunteers ORDER BY created_at DESC').all().map(rowToVolunteer);
  },

  findById(id) {
    return rowToVolunteer(db.prepare('SELECT * FROM volunteers WHERE id = ?').get(id));
  },

  findByInterest(interest) {
    return this.findAll().filter(v => v.interests.includes(interest));
  },

  create({ name, email, phone = '', interests = [], skills = '', message = '', availableHours = '' }) {
    // Check for duplicate email
    const existing = db.prepare('SELECT id FROM volunteers WHERE email = ?').get(email);
    if (existing) return { error: 'Email already registered.' };

    const id  = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO volunteers (id, name, email, phone, interests, skills, message, available_hours, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, name, email, phone, JSON.stringify(interests), skills, message, availableHours, now);

    return this.findById(id);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE volunteers SET status = ? WHERE id = ?').run(status, id);
    return this.findById(id);
  },
};

module.exports = Volunteer;
