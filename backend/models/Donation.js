const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Donation {
  static async create(donationData) {
    const {
      donorId,
      donorName,
      foodType,
      quantity,
      unit,
      description,
      location,
      pickupTime,
      expiryDate,
      imageUrl
    } = donationData;

    const id = uuidv4();
    
    const query = `
      INSERT INTO donations (
        id, donor_id, donor_name, food_type, quantity, unit, description,
        location, pickup_time, expiry_date, image_url, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      id, donorId, donorName, foodType, quantity, unit, description,
      JSON.stringify(location), pickupTime, expiryDate, imageUrl
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByDonor(donorId) {
    const query = `
      SELECT * FROM donations 
      WHERE donor_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [donorId]);
    return result.rows;
  }

  static async findAvailable() {
    const query = `
      SELECT * FROM donations 
      WHERE status = 'pending' 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateStatus(id, status, matchedWith = null) {
    const query = `
      UPDATE donations 
      SET status = $1, matched_with = $2, matched_at = $3, updated_at = NOW()
      WHERE id = $4 
      RETURNING *
    `;
    
    const matchedAt = matchedWith ? new Date() : null;
    const values = [status, matchedWith, matchedAt, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM donations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM donations ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getAnalytics() {
    const query = `
      SELECT 
        COUNT(*) as total_donations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_donations,
        COUNT(CASE WHEN status = 'matched' THEN 1 END) as matched_donations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_donations,
        SUM(CAST(quantity AS INTEGER)) as total_quantity
      FROM donations
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Donation;