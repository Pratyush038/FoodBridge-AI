const pool = require('../config/database');

class User {
  static async create(userData) {
    const { uid, email, name, role, organizationName } = userData;
    
    const query = `
      INSERT INTO users (uid, email, name, role, organization_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [uid, email, name, role, organizationName];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUid(uid) {
    const query = 'SELECT * FROM users WHERE uid = $1';
    const result = await pool.query(query, [uid]);
    return result.rows[0];
  }

  static async updateRole(uid, role) {
    const query = `
      UPDATE users 
      SET role = $1, updated_at = NOW() 
      WHERE uid = $2 
      RETURNING *
    `;
    
    const result = await pool.query(query, [role, uid]);
    return result.rows[0];
  }

  static async getUserRole(uid) {
    const query = 'SELECT role FROM users WHERE uid = $1';
    const result = await pool.query(query, [uid]);
    return result.rows[0]?.role;
  }

  static async updateProfile(uid, profileData) {
    const { name, organizationName, location } = profileData;
    
    const query = `
      UPDATE users 
      SET name = $1, organization_name = $2, location = $3, updated_at = NOW()
      WHERE uid = $4 
      RETURNING *
    `;
    
    const values = [name, organizationName, JSON.stringify(location), uid];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = User;